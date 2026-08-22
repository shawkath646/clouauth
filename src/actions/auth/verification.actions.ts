"use server";
import { getEnv } from "@/utils/env";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getTempSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { verify } from "otplib";
import { type SignInReturn } from "./auth.actions";
import { decryptSymmetric } from "@/lib/encryption";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function triggerVerificationMethod(tempSessionId: string, methodType: string) {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { success: false, error: "Session expired or invalid. Please sign in again." };
    }

    const user = await prisma.user.findUnique({
      where: { id: tempSession.user_id },
      select: {
        id: true,
        emails: { where: { is_primary: true }, select: { address: true } },
        two_factor: {
          select: {
            passkeys: { select: { id: true } },
            totp: { select: { id: true, enabled: true } },
            email_id: true,
          }
        }
      }
    });

    if (!user || !user.two_factor) {
      return { success: false, error: "Verification method not available." };
    }

    switch (methodType) {
      case "email":
        const destination = user.emails[0]?.address;
        if (!destination) return { success: false, error: "No primary email found." };
        return await sendVerificationCode(user.id, tempSessionId, destination);
      case "passkey":
        return await triggerPasskeyVerification(user.id, tempSessionId);
      case "totp":
        return { success: true as const, message: "Please enter the code from your authenticator app." };
      default:
        return { success: false as const, error: "Unsupported verification method." };
    }
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute triggerVerificationMethod");
    return { success: false as const, error: em };
  }
}

async function sendVerificationCode(userId: string, tempSessionId: string, destination: string) {
  try {
    const rawCode = Array.from({ length: 8 }, () => crypto.randomInt(0, 10)).join("");
    const codeHash = await bcrypt.hash(rawCode, 12);

    await prisma.tempSession.update({
      where: { id: tempSessionId },
      data: {
        code_hash: codeHash,
        type: "2fa",
        destination,
        expires_on: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    await sendEmail("verification_code", {
      data: { code: rawCode }, userId
    });

    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute sendVerificationCode");
    return { success: false, error: em };
  }
}

async function triggerPasskeyVerification(userId: string, tempSessionId: string) {
  try {
    const passkeys = await prisma.passkeyCredential.findMany({
      where: {
        two_factor_id: userId,
      },
    });

    if (passkeys.length === 0) {
      return { success: false as const, error: "No passkeys registered for this account." };
    }

    const rpID = getEnv("NEXT_PUBLIC_RP_ID");

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: passkeys.map((passkey) => ({
        id: passkey.credential_id,
        type: "public-key",
      })),
      userVerification: "preferred",
    });

    await prisma.tempSession.update({
      where: { id: tempSessionId },
      data: { challenge: options.challenge },
    });

    return { success: true as const, payload: options };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute triggerPasskeyVerification");
    return { success: false as const, error: em };
  }
}

export async function resolveCodeVerification(
  tempSessionId: string, 
  code: string
): Promise<SignInReturn> {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { action: "ERROR", error: "Session expired or invalid. Please sign in again." };
    }

    if (!tempSession.code_hash) return { action: "ERROR", error: "No active verification code found." };

    if (tempSession.locked_until && tempSession.locked_until > new Date()) {
      const minutesLeft = Math.ceil((tempSession.locked_until.getTime() - Date.now()) / 60000);
      return { action: "ERROR", error: `Too many failed attempts. Try again in ${minutesLeft} minutes.` };
    }

    const isValid = await bcrypt.compare(code, tempSession.code_hash);

    if (!isValid) {
      const updatedSession = await prisma.tempSession.update({
        where: { id: tempSession.id },
        data: { failed_attempts: { increment: 1 } }
      });

      if (updatedSession.failed_attempts >= MAX_ATTEMPTS) {
        await prisma.tempSession.update({
          where: { id: tempSession.id },
          data: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) }
        });
      }
      return { action: "ERROR", error: "Invalid verification code." };
    }

    await prisma.tempSession.update({
      where: { id: tempSession.id },
      data: { code_hash: null, two_step_processed: true, failed_attempts: 0, locked_until: null }
    });

    const { finalizeSignIn } = await import("./auth.actions");
    return await finalizeSignIn(tempSession.user_id, tempSessionId);
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute resolveCodeVerification");
    return { action: "ERROR", error: em };
  }
}

export async function resolvePasskeyVerification(
  tempSessionId: string, 
  payload: Parameters<typeof verifyAuthenticationResponse>[0]["response"]
): Promise<SignInReturn> {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { action: "ERROR", error: "Session expired or invalid." };
    }

    if (!tempSession.challenge) {
      return { action: "ERROR", error: "No authentication challenge found for this session." };
    }

    if (tempSession.locked_until && tempSession.locked_until > new Date()) {
      const minutesLeft = Math.ceil((tempSession.locked_until.getTime() - Date.now()) / 60000);
      return { action: "ERROR", error: `Too many failed attempts. Try again in ${minutesLeft} minutes.` };
    }

    if (!payload || !payload.id) {
      return { action: "ERROR", error: "Invalid passkey payload." };
    }

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { credential_id: payload.id },
      include: {
        two_factor: true,
      },
    });

    if (!passkey || passkey.two_factor_id !== tempSession.user_id) {
      return { action: "ERROR", error: "Passkey not recognized for this account." };
    }

    const rpID = getEnv("NEXT_PUBLIC_RP_ID");
    const origin = getEnv("NEXT_PUBLIC_BASE_URL");
    const expectedOrigin = [
      origin,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];

    const credentialPublicKey = new Uint8Array(
      Buffer.from(
        passkey.public_key,
        passkey.public_key.includes("-") || passkey.public_key.includes("_") ? "base64url" : "base64"
      )
    );

    const normalizedPayload = {
      ...payload,
      authenticatorAttachment:
        payload.authenticatorAttachment === "platform" || payload.authenticatorAttachment === "cross-platform"
          ? payload.authenticatorAttachment
          : undefined,
    } as Parameters<typeof verifyAuthenticationResponse>[0]["response"];

    const verification = await verifyAuthenticationResponse({
      response: normalizedPayload,
      expectedChallenge: tempSession.challenge,
      expectedOrigin,
      expectedRPID: [rpID, "localhost"],
      requireUserVerification: false,
      credential: {
        id: passkey.credential_id,
        publicKey: credentialPublicKey,
        counter: passkey.sign_count,
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      const updatedSession = await prisma.tempSession.update({
        where: { id: tempSession.id },
        data: { failed_attempts: { increment: 1 } }
      });
      if (updatedSession.failed_attempts >= MAX_ATTEMPTS) {
        await prisma.tempSession.update({
          where: { id: tempSession.id },
          data: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) }
        });
      }
      return { action: "ERROR", error: "Passkey verification failed." };
    }

    await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: {
        sign_count: verification.authenticationInfo.newCounter,
        last_used_on: new Date(),
      },
    });

    await prisma.tempSession.update({
      where: { id: tempSession.id },
      data: { two_step_processed: true, failed_attempts: 0, locked_until: null }
    });

    const { finalizeSignIn } = await import("./auth.actions");
    return await finalizeSignIn(tempSession.user_id, tempSessionId);
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute resolvePasskeyVerification");
    return { action: "ERROR", error: em };
  }
}

export async function resolveTotpVerification(
  tempSessionId: string, 
  code: string
): Promise<SignInReturn> {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { action: "ERROR", error: "Session expired or invalid. Please sign in again." };
    }

    if (tempSession.locked_until && tempSession.locked_until > new Date()) {
      const minutesLeft = Math.ceil((tempSession.locked_until.getTime() - Date.now()) / 60000);
      return { action: "ERROR", error: `Too many failed attempts. Try again in ${minutesLeft} minutes.` };
    }

    const totpCred = await prisma.totpMethod.findFirst({
      where: {
        two_factor_id: tempSession.user_id,
        enabled: true
      }
    });

    if (!totpCred) return { action: "ERROR", error: "Authenticator app not configured." };

    const { valid } = await verify({ token: code, secret: decryptSymmetric(totpCred.secret) });

    if (!valid) {
      const updatedSession = await prisma.tempSession.update({
        where: { id: tempSession.id },
        data: { failed_attempts: { increment: 1 } }
      });
      if (updatedSession.failed_attempts >= MAX_ATTEMPTS) {
        await prisma.tempSession.update({
          where: { id: tempSession.id },
          data: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) }
        });
      }
      return { action: "ERROR", error: "Invalid authenticator code." };
    }

    await prisma.tempSession.update({
      where: { id: tempSession.id },
      data: { two_step_processed: true, failed_attempts: 0, locked_until: null }
    });

    const { finalizeSignIn } = await import("./auth.actions");
    return await finalizeSignIn(tempSession.user_id, tempSessionId);
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute resolveTotpVerification");
    return { action: "ERROR", error: em };
  }
}

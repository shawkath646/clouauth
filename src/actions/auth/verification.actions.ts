"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getTempSession } from "@/lib/session";
import { handleError } from "@/utils/utils";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import crypto from "crypto";
import { sendVerificationCodeEmail } from "@/lib/email";
import { verify } from "otplib";

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
        two_factor_methods: {
          where: { enabled: true, type: methodType },
          select: { id: true, type: true }
        }
      }
    });

    if (!user || user.two_factor_methods.length === 0) {
      return { success: false, error: "Verification method not available." };
    }

    switch (methodType) {
      case "email":
      case "sms":
        return await sendVerificationCode(user.id);
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

async function sendVerificationCode(userId: string) {
  try {
    const rawCode = Array.from({ length: 8 }, () => crypto.randomInt(0, 10)).join("");
    const codeHash = await bcrypt.hash(rawCode, 12);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emails: { where: { is_primary: true }, select: { address: true } },
      }
    });

    const destination = user?.emails[0]?.address;
    if (!destination) {
      return { success: false, error: "No primary email address found for this user." };
    }

    const previousCode = await prisma.verificationCode.findFirst({
      where: { user_id: userId, type: "2fa", consumed_on: null },
      orderBy: { created_on: 'desc' }
    });

    const failedAttempts = previousCode?.failed_attempts || 0;
    const lockedUntil = previousCode?.locked_until || null;

    if (previousCode) {
      await prisma.verificationCode.updateMany({
        where: { user_id: userId, type: "2fa", consumed_on: null },
        data: { consumed_on: new Date() }
      });
    }

    await prisma.verificationCode.create({
      data: {
        user_id: userId,
        type: "2fa",
        destination,
        code_hash: codeHash,
        expires_on: new Date(Date.now() + 10 * 60 * 1000),
        failed_attempts: failedAttempts,
        locked_until: lockedUntil
      }
    });

    await sendVerificationCodeEmail(destination, rawCode);

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
        two_factor_method: {
          user_id: userId,
          enabled: true,
        },
      },
    });

    if (passkeys.length === 0) {
      return { success: false as const, error: "No passkeys registered for this account." };
    }

    const rpID = process.env.NEXT_PUBLIC_RP_ID || "localhost";

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

export async function resolveCodeVerification(tempSessionId: string, code: string) {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { success: false, error: "Session expired or invalid. Please sign in again." };
    }

    const vCode = await prisma.verificationCode.findFirst({
      where: { user_id: tempSession.user_id, type: "2fa", consumed_on: null },
      orderBy: { created_on: 'desc' }
    });

    if (!vCode) return { success: false, error: "No active verification code found." };

    if (vCode.locked_until && vCode.locked_until > new Date()) {
      const minutesLeft = Math.ceil((vCode.locked_until.getTime() - Date.now()) / 60000);
      return { success: false, error: `Too many failed attempts. Try again in ${minutesLeft} minutes.` };
    }

    if (vCode.expires_on < new Date()) {
      return { success: false, error: "Verification code expired." };
    }

    const isValid = await bcrypt.compare(code, vCode.code_hash);

    if (!isValid) {
      const updatedCode = await prisma.verificationCode.update({
        where: { id: vCode.id },
        data: { failed_attempts: { increment: 1 } }
      });

      if (updatedCode.failed_attempts >= MAX_ATTEMPTS) {
        await prisma.verificationCode.update({
          where: { id: vCode.id },
          data: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) }
        });
      }
      return { success: false, error: "Invalid verification code." };
    }

    await prisma.verificationCode.update({
      where: { id: vCode.id },
      data: { consumed_on: new Date() }
    });

    const { finalizeSignIn } = await import("./auth.actions");
    return await finalizeSignIn(tempSession.user_id, false, tempSessionId);
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute resolveCodeVerification");
    return { success: false, error: em };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolvePasskeyVerification(tempSessionId: string, payload: any) {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { success: false, error: "Session expired or invalid." };
    }

    if (!tempSession.challenge) {
      return { success: false, error: "No authentication challenge found for this session." };
    }

    if (!payload || !payload.id) {
      return { success: false, error: "Invalid passkey payload." };
    }

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { credential_id: payload.id },
      include: {
        two_factor_method: true,
      },
    });

    if (!passkey || passkey.two_factor_method.user_id !== tempSession.user_id) {
      return { success: false, error: "Passkey not recognized for this account." };
    }

    const rpID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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

    const verification = await verifyAuthenticationResponse({
      response: payload,
      expectedChallenge: tempSession.challenge,
      expectedOrigin,
      expectedRPID: [rpID, "localhost"],
      credential: {
        id: passkey.credential_id,
        publicKey: credentialPublicKey,
        counter: passkey.sign_count,
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return { success: false, error: "Passkey verification failed." };
    }

    await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: {
        sign_count: verification.authenticationInfo.newCounter,
        last_used_on: new Date(),
      },
    });

    const { finalizeSignIn } = await import("./auth.actions");
    return await finalizeSignIn(tempSession.user_id, false, tempSessionId);
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute resolvePasskeyVerification");
    return { success: false, error: em };
  }
}

export async function resolveTotpVerification(tempSessionId: string, code: string) {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { success: false, error: "Session expired or invalid. Please sign in again." };
    }

    const totpCred = await prisma.totpCredential.findFirst({
      where: {
        two_factor_method: {
          user_id: tempSession.user_id,
          type: "totp",
          enabled: true
        }
      }
    });

    if (!totpCred) return { success: false, error: "Authenticator app not configured." };
    
    const { valid } = await verify({ token: code, secret: totpCred.secret });
    
    if (!valid) {
      return { success: false, error: "Invalid authenticator code." };
    }

    const { finalizeSignIn } = await import("./auth.actions");
    return await finalizeSignIn(tempSession.user_id, false, tempSessionId);
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute resolveTotpVerification");
    return { success: false, error: em };
  }
}

"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { handleError } from "@/utils/error";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { verify } from "otplib";
import { finalizeSignIn, type SignInReturn } from "./auth";
import { decryptSymmetric } from "@/lib/encryption";
import {
  requireValidTempSession,
  checkLockout,
  handleFailedAttempt,
  markTempSessionVerified,
  getWebAuthnConfig,
} from "./helpers";

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
        expires_on: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail("verification_code", {
      data: { code: rawCode },
      userId,
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

    const { rpID } = getWebAuthnConfig();

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

export type TriggerVerificationResult = {
  success: boolean;
  error?: string;
  payload?: unknown;
  message?: string;
};

export async function triggerVerificationMethod(
  tempSessionId: string,
  methodType: string
): Promise<TriggerVerificationResult> {
  try {
    const tempSession = await requireValidTempSession(tempSessionId);

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
          },
        },
      },
    });

    if (!user || !user.two_factor) {
      return { success: false, error: "Verification method not available." };
    }

    switch (methodType) {
      case "email": {
        const destination = user.emails[0]?.address;
        if (!destination) return { success: false, error: "No primary email found." };
        return await sendVerificationCode(user.id, tempSessionId, destination);
      }
      case "passkey":
        return await triggerPasskeyVerification(user.id, tempSessionId);
      case "totp":
        return { success: true as const, message: "Please enter the code from your authenticator app." };
      default:
        return { success: false as const, error: "Unsupported verification method." };
    }
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false as const, error: em };
  }
}

export async function resolveCodeVerification(
  tempSessionId: string,
  code: string
): Promise<SignInReturn> {
  try {
    const tempSession = await requireValidTempSession(tempSessionId);

    if (!tempSession.code_hash) {
      return { action: "ERROR", error: "No active verification code found." };
    }

    const lockoutError = checkLockout(tempSession.locked_until);
    if (lockoutError) {
      return { action: "ERROR", error: lockoutError };
    }

    const isValid = await bcrypt.compare(code, tempSession.code_hash);

    if (!isValid) {
      await handleFailedAttempt("tempSession", tempSession.id);
      return { action: "ERROR", error: "Invalid verification code." };
    }

    await markTempSessionVerified(tempSession.id, true);
    return await finalizeSignIn(tempSession.user_id, tempSessionId);
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { action: "ERROR", error: em };
  }
}

export async function resolvePasskeyVerification(
  tempSessionId: string,
  payload: Parameters<typeof verifyAuthenticationResponse>[0]["response"]
): Promise<SignInReturn> {
  try {
    const tempSession = await requireValidTempSession(tempSessionId);

    if (!tempSession.challenge) {
      return { action: "ERROR", error: "No authentication challenge found for this session." };
    }

    const lockoutError = checkLockout(tempSession.locked_until);
    if (lockoutError) {
      return { action: "ERROR", error: lockoutError };
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

    const { expectedOrigin, expectedRPID } = getWebAuthnConfig();

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
      expectedRPID,
      requireUserVerification: false,
      credential: {
        id: passkey.credential_id,
        publicKey: credentialPublicKey,
        counter: passkey.sign_count,
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      await handleFailedAttempt("tempSession", tempSession.id);
      return { action: "ERROR", error: "Passkey verification failed." };
    }

    await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: {
        sign_count: verification.authenticationInfo.newCounter,
        last_used_on: new Date(),
      },
    });

    await markTempSessionVerified(tempSession.id);
    return await finalizeSignIn(tempSession.user_id, tempSessionId);
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { action: "ERROR", error: em };
  }
}

export async function resolveTotpVerification(
  tempSessionId: string,
  code: string
): Promise<SignInReturn> {
  try {
    const tempSession = await requireValidTempSession(tempSessionId);

    const lockoutError = checkLockout(tempSession.locked_until);
    if (lockoutError) {
      return { action: "ERROR", error: lockoutError };
    }

    const totpCred = await prisma.totpMethod.findFirst({
      where: {
        two_factor_id: tempSession.user_id,
        enabled: true,
      },
    });

    if (!totpCred) {
      return { action: "ERROR", error: "Authenticator app not configured." };
    }

    const { valid } = await verify({ token: code, secret: decryptSymmetric(totpCred.secret) });

    if (!valid) {
      await handleFailedAttempt("tempSession", tempSession.id);
      return { action: "ERROR", error: "Invalid authenticator code." };
    }

    await markTempSessionVerified(tempSession.id);
    return await finalizeSignIn(tempSession.user_id, tempSessionId);
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { action: "ERROR", error: em };
  }
}

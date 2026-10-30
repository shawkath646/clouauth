"use server";

import prisma from "@/lib/prisma";
import { verifyPassword, hashCode, verifyCode } from "@/lib/security/hash";
import crypto from "crypto";
import { verify } from "otplib";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { handleError } from "@/utils/error";
import { sendEmail } from "@/lib/email";
import { decryptSymmetric } from "@/lib/encryption";
import { verifyRecaptcha } from "@/lib/recaptcha/server";
import { getUserSession } from "@/lib/session";
import {
  getWebAuthnConfig,
  checkLockout,
  handleFailedAttempt,
} from "./helpers";
import { recordSecurityActivity } from "@/lib/security-activity";

export interface SudoActionResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  options?: unknown;
}

/**
 * Validates that the Sudo TempSession exists, is not expired, and belongs to the currently authenticated user session.
 */
async function requireAuthenticatedSudoSession(tempSessionId: string) {
  const activeSessionData = await getUserSession();
  if (!activeSessionData?.session) {
    return {
      ok: false as const,
      error: "Unauthorized. Please sign in again.",
    };
  }

  const tempSession = await prisma.tempSession.findUnique({
    where: { id: tempSessionId },
  });

  if (
    !tempSession ||
    tempSession.expires_on < new Date() ||
    tempSession.flow_type !== "sudo"
  ) {
    return {
      ok: false as const,
      error: "Verification session expired. Please try again.",
    };
  }

  if (tempSession.user_id !== activeSessionData.user.id) {
    return {
      ok: false as const,
      error: "Session mismatch. Unauthorized step-up request.",
    };
  }

  return {
    ok: true as const,
    tempSession,
    activeSessionData,
  };
}

/**
 * Marks the active session as fresh in Sudo mode, deletes the tempSession,
 * records security activity, and returns the target redirect URL.
 */
async function completeSudoSuccess(
  tempSessionId: string,
  sessionId: string,
  userId: string,
  payloadString?: string | null
): Promise<SudoActionResult> {
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { last_authenticated_on: new Date() },
  });

  await prisma.tempSession.delete({
    where: { id: tempSessionId },
  }).catch(() => {});

  await recordSecurityActivity({
    userId,
    event: "SUDO_VERIFIED",
    title: "Elevated access granted",
    description: "Sudo re-authentication confirmed for sensitive settings access",
  });

  let returnTo = "/profile";
  if (payloadString) {
    try {
      const parsed = JSON.parse(payloadString);
      if (
        parsed.return_to &&
        parsed.return_to.startsWith("/") &&
        !parsed.return_to.startsWith("//")
      ) {
        returnTo = parsed.return_to;
      }
    } catch {}
  }

  return { success: true, redirectUrl: returnTo };
}

/**
 * Higher-order runner executing standard step-up verifications with uniform reCAPTCHA,
 * session authentication, lockout guarding, failed attempt auditing, and success elevation.
 */
async function runSudoVerification(
  tempSessionId: string,
  recaptchaAction: string,
  recaptchaToken: string | undefined,
  verifier: (ctx: {
    tempSession: NonNullable<Awaited<ReturnType<typeof requireAuthenticatedSudoSession>>["tempSession"]>;
    userId: string;
  }) => Promise<{ ok: boolean; error?: string }>
): Promise<SudoActionResult> {
  try {
    const recaptcha = await verifyRecaptcha(recaptchaToken, {
      expectedAction: recaptchaAction,
    });
    if (!recaptcha.success) {
      return {
        success: false,
        error: recaptcha.error || "Security check failed.",
      };
    }

    if (!tempSessionId) {
      return { success: false, error: "Missing required session token." };
    }

    const sudoCtx = await requireAuthenticatedSudoSession(tempSessionId);
    if (!sudoCtx.ok) {
      return { success: false, error: sudoCtx.error };
    }

    const { tempSession, activeSessionData } = sudoCtx;

    const lockout = checkLockout(tempSession.locked_until);
    if (lockout) {
      return { success: false, error: lockout };
    }

    const verificationResult = await verifier({
      tempSession,
      userId: tempSession.user_id,
    });

    if (!verificationResult.ok) {
      await handleFailedAttempt("tempSession", tempSession.id);
      return {
        success: false,
        error: verificationResult.error || "Verification failed.",
      };
    }

    return await completeSudoSuccess(
      tempSession.id,
      activeSessionData.session.id,
      tempSession.user_id,
      tempSession.payload
    );
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

/**
 * 1. Resolve Sudo via Password
 */
export async function resolveSudoPassword(
  tempSessionId: string,
  password: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  if (!password) {
    return { success: false, error: "Password is required." };
  }

  return runSudoVerification(
    tempSessionId,
    "sudo_password",
    recaptchaToken,
    async ({ userId }) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { password: true },
      });

      if (!user?.password) {
        return { ok: false, error: "No password configured for this account." };
      }

      const isMatch = await verifyPassword(password, user.password.password_hash);
      return { ok: isMatch, error: isMatch ? undefined : "Incorrect password." };
    }
  );
}

/**
 * 2. Get Sudo Passkey Authentication Options
 */
export async function getSudoPasskeyOptions(
  tempSessionId: string
): Promise<SudoActionResult> {
  try {
    const sudoCtx = await requireAuthenticatedSudoSession(tempSessionId);
    if (!sudoCtx.ok) {
      return { success: false, error: sudoCtx.error };
    }

    const { tempSession } = sudoCtx;

    const passkeys = await prisma.passkeyCredential.findMany({
      where: { two_factor_id: tempSession.user_id },
    });

    if (passkeys.length === 0) {
      return {
        success: false,
        error: "No passkeys registered for this account.",
      };
    }

    const { rpID } = await getWebAuthnConfig();
    const matchingPasskeys = passkeys.filter(
      (p) => !p.rp_id || p.rp_id === rpID
    );

    if (matchingPasskeys.length === 0) {
      return {
        success: false,
        error: `No passkeys registered for this domain (${rpID}).`,
      };
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
    });

    await prisma.tempSession.update({
      where: { id: tempSession.id },
      data: { challenge: options.challenge },
    });

    return { success: true, options };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

/**
 * 3. Resolve Sudo via Passkey
 */
export async function resolveSudoPasskey(
  tempSessionId: string,
  payload: Parameters<typeof verifyAuthenticationResponse>[0]["response"]
): Promise<SudoActionResult> {
  try {
    const sudoCtx = await requireAuthenticatedSudoSession(tempSessionId);
    if (!sudoCtx.ok) {
      return { success: false, error: sudoCtx.error };
    }

    const { tempSession, activeSessionData } = sudoCtx;

    if (!tempSession.challenge) {
      return {
        success: false,
        error: "No active challenge found. Please retry.",
      };
    }

    const expectedChallenge = tempSession.challenge;

    // Immediately clear challenge to avoid replay attacks
    await prisma.tempSession.update({
      where: { id: tempSession.id },
      data: { challenge: null },
    });

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { credential_id: payload.id },
    });

    if (!passkey || passkey.two_factor_id !== tempSession.user_id) {
      await handleFailedAttempt("tempSession", tempSession.id);
      return {
        success: false,
        error: "Passkey not recognized for this account.",
      };
    }

    const { expectedOrigin, expectedRPID } = await getWebAuthnConfig();

    const rawKey = passkey.public_key.trim();
    const isBase64Url = rawKey.includes("-") || rawKey.includes("_");
    const keyBuf = Buffer.from(rawKey, isBase64Url ? "base64url" : "base64");
    const credentialPublicKey = new Uint8Array(
      keyBuf.buffer,
      keyBuf.byteOffset,
      keyBuf.byteLength
    );

    const normalizedPayload = {
      ...payload,
      authenticatorAttachment:
        payload.authenticatorAttachment === "platform" ||
        payload.authenticatorAttachment === "cross-platform"
          ? payload.authenticatorAttachment
          : undefined,
    } as Parameters<typeof verifyAuthenticationResponse>[0]["response"];

    const verification = await verifyAuthenticationResponse({
      response: normalizedPayload,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      requireUserVerification: false,
      credential: {
        id: passkey.credential_id,
        publicKey: credentialPublicKey,
        counter: passkey.sign_count,
      },
    });

    if (!verification.verified) {
      await handleFailedAttempt("tempSession", tempSession.id);
      return { success: false, error: "Passkey verification failed." };
    }

    // Update passkey counter
    await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: {
        sign_count: verification.authenticationInfo.newCounter,
        last_used_on: new Date(),
      },
    });

    return await completeSudoSuccess(
      tempSession.id,
      activeSessionData.session.id,
      tempSession.user_id,
      tempSession.payload
    );
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

/**
 * 4. Send Sudo Email Verification Code (OTP)
 */
export async function sendSudoEmailCode(
  tempSessionId: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  try {
    const recaptcha = await verifyRecaptcha(recaptchaToken, {
      expectedAction: "send_sudo_code",
    });
    if (!recaptcha.success) {
      return {
        success: false,
        error: recaptcha.error || "Security check failed.",
      };
    }

    const sudoCtx = await requireAuthenticatedSudoSession(tempSessionId);
    if (!sudoCtx.ok) {
      return { success: false, error: sudoCtx.error };
    }

    const { tempSession } = sudoCtx;

    const user = await prisma.user.findUnique({
      where: { id: tempSession.user_id },
      include: { emails: { where: { is_primary: true } } },
    });

    const primaryEmail = user?.emails[0]?.address;
    if (!primaryEmail) {
      return {
        success: false,
        error: "No primary email found for this account.",
      };
    }

    const rawCode = Array.from({ length: 6 }, () =>
      crypto.randomInt(0, 10)
    ).join("");
    const codeHash = await hashCode(rawCode);

    await prisma.tempSession.update({
      where: { id: tempSession.id },
      data: {
        code_hash: codeHash,
        destination: primaryEmail,
        failed_attempts: 0,
        locked_until: null,
      },
    });

    await sendEmail("verification_code", {
      data: { code: rawCode },
      userId: user.id,
    });

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

/**
 * 5. Resolve Sudo via Email OTP Code
 */
export async function resolveSudoEmailCode(
  tempSessionId: string,
  code: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  return runSudoVerification(
    tempSessionId,
    "verify_sudo_code",
    recaptchaToken,
    async ({ tempSession }) => {
      if (!tempSession.code_hash) {
        return {
          ok: false,
          error: "No code has been sent yet. Please request a code.",
        };
      }

      const isMatch = await verifyCode(code, tempSession.code_hash);
      return {
        ok: isMatch,
        error: isMatch ? undefined : "Incorrect verification code.",
      };
    }
  );
}

/**
 * 6. Resolve Sudo via TOTP (Authenticator App)
 */
export async function resolveSudoTotp(
  tempSessionId: string,
  code: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  return runSudoVerification(
    tempSessionId,
    "verify_sudo_totp",
    recaptchaToken,
    async ({ userId }) => {
      const totp = await prisma.totpMethod.findUnique({
        where: { two_factor_id: userId },
      });

      if (!totp || !totp.enabled) {
        return { ok: false, error: "Authenticator app is not enabled." };
      }

      const decryptedSecret = decryptSymmetric(totp.secret);
      const { valid } = await verify({
        token: code.trim(),
        secret: decryptedSecret,
      });

      return {
        ok: valid,
        error: valid ? undefined : "Incorrect authenticator code.",
      };
    }
  );
}

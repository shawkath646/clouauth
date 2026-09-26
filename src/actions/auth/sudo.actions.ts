"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
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
import { getWebAuthnConfig, checkLockout, handleFailedAttempt } from "./helpers";

export interface SudoActionResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  options?: unknown;
}

/**
 * Common success helper: marks the active session as fresh in Sudo mode,
 * deletes the tempSession, and returns the target redirect URL.
 */
async function completeSudoSuccess(
  tempSessionId: string,
  userId: string,
  payloadString?: string | null
): Promise<SudoActionResult> {
  // Update active session
  const activeSessionData = await getUserSession();
  if (activeSessionData?.session && activeSessionData.user.id === userId) {
    await prisma.userSession.update({
      where: { id: activeSessionData.session.id },
      data: { last_authenticated_on: new Date() },
    });
  }

  // Delete the Sudo TempSession
  await prisma.tempSession.delete({
    where: { id: tempSessionId },
  }).catch(() => {});

  let returnTo = "/profile";
  if (payloadString) {
    try {
      const parsed = JSON.parse(payloadString);
      if (parsed.return_to && parsed.return_to.startsWith("/") && !parsed.return_to.startsWith("//")) {
        returnTo = parsed.return_to;
      }
    } catch {}
  }

  return { success: true, redirectUrl: returnTo };
}

/**
 * 1. Resolve Sudo via Password
 */
export async function resolveSudoPassword(
  tempSessionId: string,
  password: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  try {
    const recaptcha = await verifyRecaptcha(recaptchaToken, { expectedAction: "sudo_password" });
    if (!recaptcha.success) {
      return { success: false, error: recaptcha.error || "Security check failed." };
    }

    if (!tempSessionId || !password) {
      return { success: false, error: "Missing required credentials." };
    }

    const tempSession = await prisma.tempSession.findUnique({
      where: { id: tempSessionId },
    });

    if (!tempSession || tempSession.expires_on < new Date() || tempSession.flow_type !== "sudo") {
      return { success: false, error: "Verification session expired. Please try again." };
    }

    const lockout = checkLockout(tempSession.locked_until);
    if (lockout) {
      return { success: false, error: lockout };
    }

    const user = await prisma.user.findUnique({
      where: { id: tempSession.user_id },
      include: { password: true },
    });

    if (!user || !user.password) {
      return { success: false, error: "No password configured for this account." };
    }

    const isMatch = await bcrypt.compare(password, user.password.password_hash);
    if (!isMatch) {
      await handleFailedAttempt("tempSession", tempSession.id);
      return { success: false, error: "Incorrect password." };
    }

    return await completeSudoSuccess(tempSession.id, user.id, tempSession.payload);
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

/**
 * 2. Get Sudo Passkey Authentication Options
 */
export async function getSudoPasskeyOptions(
  tempSessionId: string
): Promise<SudoActionResult> {
  try {
    const tempSession = await prisma.tempSession.findUnique({
      where: { id: tempSessionId },
    });

    if (!tempSession || tempSession.expires_on < new Date() || tempSession.flow_type !== "sudo") {
      return { success: false, error: "Verification session expired." };
    }

    const passkeys = await prisma.passkeyCredential.findMany({
      where: { two_factor_id: tempSession.user_id },
    });

    if (passkeys.length === 0) {
      return { success: false, error: "No passkeys registered for this account." };
    }

    const { rpID } = await getWebAuthnConfig();
    const matchingPasskeys = passkeys.filter((p) => !p.rp_id || p.rp_id === rpID);

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
    const tempSession = await prisma.tempSession.findUnique({
      where: { id: tempSessionId },
    });

    if (!tempSession || tempSession.expires_on < new Date() || tempSession.flow_type !== "sudo") {
      return { success: false, error: "Verification session expired." };
    }

    if (!tempSession.challenge) {
      return { success: false, error: "No active challenge found. Please retry." };
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
      return { success: false, error: "Passkey not recognized for this account." };
    }

    const { expectedOrigin, expectedRPID } = await getWebAuthnConfig();

    const rawKey = passkey.public_key.trim();
    const isBase64Url = rawKey.includes("-") || rawKey.includes("_");
    const keyBuf = Buffer.from(rawKey, isBase64Url ? "base64url" : "base64");
    const credentialPublicKey = new Uint8Array(keyBuf.buffer, keyBuf.byteOffset, keyBuf.byteLength);

    const normalizedPayload = {
      ...payload,
      authenticatorAttachment:
        payload.authenticatorAttachment === "platform" || payload.authenticatorAttachment === "cross-platform"
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

    return await completeSudoSuccess(tempSession.id, tempSession.user_id, tempSession.payload);
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
    const recaptcha = await verifyRecaptcha(recaptchaToken, { expectedAction: "send_sudo_code" });
    if (!recaptcha.success) {
      return { success: false, error: recaptcha.error || "Security check failed." };
    }

    const tempSession = await prisma.tempSession.findUnique({
      where: { id: tempSessionId },
    });

    if (!tempSession || tempSession.expires_on < new Date() || tempSession.flow_type !== "sudo") {
      return { success: false, error: "Verification session expired." };
    }

    const user = await prisma.user.findUnique({
      where: { id: tempSession.user_id },
      include: { emails: { where: { is_primary: true } } },
    });

    const primaryEmail = user?.emails[0]?.address;
    if (!primaryEmail) {
      return { success: false, error: "No primary email found for this account." };
    }

    const rawCode = Array.from({ length: 6 }, () => crypto.randomInt(0, 10)).join("");
    const codeHash = await bcrypt.hash(rawCode, 12);

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
  try {
    const recaptcha = await verifyRecaptcha(recaptchaToken, { expectedAction: "verify_sudo_code" });
    if (!recaptcha.success) {
      return { success: false, error: recaptcha.error || "Security check failed." };
    }

    const tempSession = await prisma.tempSession.findUnique({
      where: { id: tempSessionId },
    });

    if (!tempSession || tempSession.expires_on < new Date() || tempSession.flow_type !== "sudo") {
      return { success: false, error: "Verification session expired." };
    }

    const lockout = checkLockout(tempSession.locked_until);
    if (lockout) {
      return { success: false, error: lockout };
    }

    if (!tempSession.code_hash) {
      return { success: false, error: "No code has been sent yet. Please request a code." };
    }

    const isMatch = await bcrypt.compare(code.trim(), tempSession.code_hash);
    if (!isMatch) {
      await handleFailedAttempt("tempSession", tempSession.id);
      return { success: false, error: "Incorrect verification code." };
    }

    return await completeSudoSuccess(tempSession.id, tempSession.user_id, tempSession.payload);
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

/**
 * 6. Resolve Sudo via TOTP (Authenticator App)
 */
export async function resolveSudoTotp(
  tempSessionId: string,
  code: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  try {
    const recaptcha = await verifyRecaptcha(recaptchaToken, { expectedAction: "verify_sudo_totp" });
    if (!recaptcha.success) {
      return { success: false, error: recaptcha.error || "Security check failed." };
    }

    const tempSession = await prisma.tempSession.findUnique({
      where: { id: tempSessionId },
    });

    if (!tempSession || tempSession.expires_on < new Date() || tempSession.flow_type !== "sudo") {
      return { success: false, error: "Verification session expired." };
    }

    const lockout = checkLockout(tempSession.locked_until);
    if (lockout) {
      return { success: false, error: lockout };
    }

    const totp = await prisma.totpMethod.findUnique({
      where: { two_factor_id: tempSession.user_id },
    });

    if (!totp || !totp.enabled) {
      return { success: false, error: "Authenticator app is not enabled." };
    }

    const decryptedSecret = decryptSymmetric(totp.secret);
    const isValid = verify({
      token: code.trim(),
      secret: decryptedSecret,
    });

    if (!isValid) {
      await handleFailedAttempt("tempSession", tempSession.id);
      return { success: false, error: "Incorrect authenticator code." };
    }

    return await completeSudoSuccess(tempSession.id, tempSession.user_id, tempSession.payload);
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

"use server";

import crypto from "crypto";
import { verify } from "otplib";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import prisma from "@/lib/prisma";
import { verifyPassword, hashCode, verifyCode } from "@/lib/security/hash";
import { handleError } from "@/utils/error";
import { sendEmail } from "@/lib/email";
import { decryptSymmetric } from "@/lib/encryption";
import { verifyRecaptcha } from "@/lib/recaptcha/server";
import { getUserSession } from "@/lib/session";
import { recordSecurityActivity } from "@/lib/security-activity";
import type { DBTempSession } from "@/types/session.types";
import { getWebAuthnConfig, checkLockout, reserveAttempt } from "./helpers";
import { getSafeReturnTo } from "@/utils/url";

export interface SudoActionResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  options?: unknown;
}

type ActiveSession = NonNullable<Awaited<ReturnType<typeof getUserSession>>>;
type AuthenticationResponse = Parameters<typeof verifyAuthenticationResponse>[0]["response"];

type SudoContext = { tempSession: DBTempSession; activeSession: ActiveSession };
type SudoContextResult =
  | ({ ok: true } & SudoContext)
  | { ok: false; error: string };

type VerifierResult = { ok: boolean; error?: string };
type Verifier = (ctx: SudoContext) => Promise<VerifierResult>;
type RecaptchaOptions = { action: string; token?: string };

const SUDO_FLOW = "sudo";
const DEFAULT_RETURN_TO = "/profile";

const fail = (error: string): SudoActionResult => ({ success: false, error });

async function checkRecaptcha(options: RecaptchaOptions): Promise<string | null> {
  const result = await verifyRecaptcha(options.token, { expectedAction: options.action });
  return result.success ? null : result.error || "Security check failed.";
}

async function requireSudoContext(tempSessionId: string): Promise<SudoContextResult> {
  if (!tempSessionId) {
    return { ok: false, error: "Missing required session token." };
  }

  const activeSession = await getUserSession();
  if (!activeSession?.session) {
    return { ok: false, error: "Unauthorized. Please sign in again." };
  }

  const tempSession = await prisma.tempSession.findUnique({
    where: { id: tempSessionId },
  });

  if (!tempSession || tempSession.expires_on < new Date() || tempSession.flow_type !== SUDO_FLOW) {
    return { ok: false, error: "Verification session expired. Please try again." };
  }

  if (tempSession.user_id !== activeSession.user.id) {
    return { ok: false, error: "Session mismatch. Unauthorized step-up request." };
  }

  return { ok: true, tempSession, activeSession };
}

function resolveReturnTo(payload: string | null | undefined): string {
  if (!payload) return DEFAULT_RETURN_TO;
  try {
    const { return_to } = JSON.parse(payload) as { return_to?: unknown };
    if (typeof return_to === "string") {
      return getSafeReturnTo(return_to, "en");
    }
  } catch {
    return DEFAULT_RETURN_TO;
  }
  return DEFAULT_RETURN_TO;
}

async function completeSudoSuccess({
  tempSession,
  activeSession,
}: SudoContext): Promise<SudoActionResult> {
  await prisma.userSession.update({
    where: { id: activeSession.session.id },
    data: { last_authenticated_on: new Date() },
  });

  await prisma.tempSession.deleteMany({ where: { id: tempSession.id } });

  await recordSecurityActivity({
    userId: tempSession.user_id,
    event: "SUDO_VERIFIED",
    title: "Elevated access granted",
    description: "Sudo re-authentication confirmed for sensitive settings access",
  });

  return { success: true, redirectUrl: resolveReturnTo(tempSession.payload) };
}

async function withSudoContext(
  tempSessionId: string,
  recaptcha: RecaptchaOptions | undefined,
  handler: (ctx: SudoContext) => Promise<SudoActionResult>
): Promise<SudoActionResult> {
  try {
    if (recaptcha) {
      const recaptchaError = await checkRecaptcha(recaptcha);
      if (recaptchaError) return fail(recaptchaError);
    }

    const ctx = await requireSudoContext(tempSessionId);
    if (!ctx.ok) return fail(ctx.error);

    const lockout = checkLockout(ctx.tempSession.locked_until);
    if (lockout) return fail(lockout);

    return await handler(ctx);
  } catch (e: unknown) {
    return fail(handleError(e, true));
  }
}

function runSudoVerification(
  tempSessionId: string,
  verifier: Verifier,
  recaptcha?: RecaptchaOptions
): Promise<SudoActionResult> {
  return withSudoContext(tempSessionId, recaptcha, async (ctx) => {
    const blocked = await reserveAttempt("tempSession", ctx.tempSession.id);
    if (blocked) return fail(blocked);

    const result = await verifier(ctx);
    if (!result.ok) return fail(result.error || "Verification failed.");

    return completeSudoSuccess(ctx);
  });
}

function decodePublicKey(stored: string): Uint8Array<ArrayBuffer> {
  const raw = stored.trim();
  const encoding = raw.includes("-") || raw.includes("_") ? "base64url" : "base64";
  return new Uint8Array(Buffer.from(raw, encoding));
}

export async function resolveSudoPassword(
  tempSessionId: string,
  password: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  if (!password) return fail("Password is required.");

  return runSudoVerification(
    tempSessionId,
    async ({ tempSession }) => {
      const credential = await prisma.passwordCredential.findUnique({
        where: { user_id: tempSession.user_id },
        select: { password_hash: true },
      });

      if (!credential) {
        return { ok: false, error: "No password configured for this account." };
      }

      const isMatch = await verifyPassword(password, credential.password_hash);
      return { ok: isMatch, error: isMatch ? undefined : "Incorrect password." };
    },
    { action: "sudo_password", token: recaptchaToken }
  );
}

export async function getSudoPasskeyOptions(
  tempSessionId: string
): Promise<SudoActionResult> {
  return withSudoContext(tempSessionId, undefined, async ({ tempSession }) => {
    const [passkeys, { rpID }] = await Promise.all([
      prisma.passkeyCredential.findMany({
        where: { two_factor_id: tempSession.user_id },
        select: { credential_id: true, rp_id: true },
      }),
      getWebAuthnConfig(),
    ]);

    if (passkeys.length === 0) {
      return fail("No passkeys registered for this account.");
    }

    const matching = passkeys.filter((p) => !p.rp_id || p.rp_id === rpID);
    if (matching.length === 0) {
      return fail(`No passkeys registered for this domain (${rpID}).`);
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: matching.map((p) => ({ id: p.credential_id })),
    });

    await prisma.tempSession.update({
      where: { id: tempSession.id },
      data: { challenge: options.challenge },
    });

    return { success: true, options };
  });
}

export async function resolveSudoPasskey(
  tempSessionId: string,
  payload: AuthenticationResponse
): Promise<SudoActionResult> {
  return runSudoVerification(tempSessionId, async ({ tempSession }) => {
    const expectedChallenge = tempSession.challenge;
    if (!expectedChallenge) {
      return { ok: false, error: "No active challenge found. Please retry." };
    }

    const { count } = await prisma.tempSession.updateMany({
      where: { id: tempSession.id, challenge: expectedChallenge },
      data: { challenge: null },
    });
    if (count !== 1) {
      return { ok: false, error: "Challenge already used. Please retry." };
    }

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { credential_id: payload.id },
    });
    if (!passkey || passkey.two_factor_id !== tempSession.user_id) {
      return { ok: false, error: "Passkey not recognized for this account." };
    }

    const { expectedOrigin, expectedRPID } = await getWebAuthnConfig();

    const attachment = payload.authenticatorAttachment;
    const response = {
      ...payload,
      authenticatorAttachment:
        attachment === "platform" || attachment === "cross-platform"
          ? attachment
          : undefined,
    } as AuthenticationResponse;

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      requireUserVerification: true,
      credential: {
        id: passkey.credential_id,
        publicKey: decodePublicKey(passkey.public_key),
        counter: passkey.sign_count,
      },
    });

    if (!verification.verified) {
      return { ok: false, error: "Passkey verification failed." };
    }

    await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: {
        sign_count: verification.authenticationInfo.newCounter,
        last_used_on: new Date(),
      },
    });

    return { ok: true };
  });
}

export async function sendSudoEmailCode(
  tempSessionId: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  return withSudoContext(
    tempSessionId,
    { action: "send_sudo_code", token: recaptchaToken },
    async ({ tempSession }) => {
      const primaryEmail = await prisma.userEmail.findFirst({
        where: { user_id: tempSession.user_id, is_primary: true },
        select: { address: true },
      });

      if (!primaryEmail) {
        return fail("No primary email found for this account.");
      }

      const rawCode = Array.from({ length: 6 }, () => crypto.randomInt(0, 10)).join("");

      await prisma.tempSession.update({
        where: { id: tempSession.id },
        data: {
          code_hash: await hashCode(rawCode),
          destination: primaryEmail.address,
        },
      });

      await sendEmail("verification_code", {
        data: { code: rawCode },
        userId: tempSession.user_id,
      });

      return { success: true };
    }
  );
}

export async function resolveSudoEmailCode(
  tempSessionId: string,
  code: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  if (!code?.trim()) return fail("Verification code is required.");

  return runSudoVerification(
    tempSessionId,
    async ({ tempSession }) => {
      if (!tempSession.code_hash) {
        return { ok: false, error: "No code has been sent yet. Please request a code." };
      }

      const isMatch = await verifyCode(code, tempSession.code_hash);
      return { ok: isMatch, error: isMatch ? undefined : "Incorrect verification code." };
    },
    { action: "verify_sudo_code", token: recaptchaToken }
  );
}

export async function resolveSudoTotp(
  tempSessionId: string,
  code: string,
  recaptchaToken?: string
): Promise<SudoActionResult> {
  if (!code?.trim()) return fail("Authenticator code is required.");

  return runSudoVerification(
    tempSessionId,
    async ({ tempSession }) => {
      const totp = await prisma.totpMethod.findUnique({
        where: { two_factor_id: tempSession.user_id },
      });

      if (!totp || !totp.enabled) {
        return { ok: false, error: "Authenticator app is not enabled." };
      }

      const { valid } = await verify({
        token: code.trim(),
        secret: decryptSymmetric(totp.secret),
      });

      return { ok: valid, error: valid ? undefined : "Incorrect authenticator code." };
    },
    { action: "verify_sudo_totp", token: recaptchaToken }
  );
}
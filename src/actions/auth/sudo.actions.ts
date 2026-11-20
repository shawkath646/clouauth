"use server";

import crypto from "crypto";
import { verify } from "otplib";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { getUserEmails } from "@/lib/users";
import {
  getPasswordCredential,
  getUserPasskeys,
  findPasskeyByCredentialId,
  updatePasskey,
  getTotpMethod,
} from "@/lib/credentials";
import {
  getUserSession,
  getTempSession,
  updateSession,
  updateTempSession,
  deleteTempSession,
} from "@/lib/session";
import { verifyPassword, hashCode, verifyCode } from "@/lib/security/hash";
import { handleError } from "@/utils/error";
import { sendEmail } from "@/lib/email";
import { decryptSymmetric } from "@/lib/encryption";
import { verifyRecaptcha } from "@/lib/recaptcha/server";
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

  const tempSession = await getTempSession(tempSessionId);

  if (!tempSession || new Date(tempSession.expires_on) < new Date() || tempSession.flow_type !== SUDO_FLOW) {
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
  await updateSession(activeSession.session.id, {
    last_authenticated_on: new Date(),
  });

  await deleteTempSession(tempSession.id);

  await recordSecurityActivity({
    userId: tempSession.user_id,
    event: "SUDO_VERIFIED",
    title: "Sensitive action authorized",
    description: "Successfully re-authenticated for privileged access",
  });

  return {
    success: true,
    redirectUrl: resolveReturnTo(tempSession.payload),
  };
}

async function withSudoContext(
  tempSessionId: string,
  recaptcha: RecaptchaOptions | undefined,
  fn: (ctx: SudoContext) => Promise<SudoActionResult>
): Promise<SudoActionResult> {
  try {
    if (recaptcha) {
      const error = await checkRecaptcha(recaptcha);
      if (error) return fail(error);
    }

    const context = await requireSudoContext(tempSessionId);
    if (!context.ok) return fail(context.error);

    const lockout = checkLockout(context.tempSession.locked_until ? new Date(context.tempSession.locked_until) : null);
    if (lockout) return fail(lockout);

    return await fn(context);
  } catch (e: unknown) {
    return fail(handleError(e, true));
  }
}

async function runSudoVerification(
  tempSessionId: string,
  verifier: Verifier,
  recaptcha?: RecaptchaOptions
): Promise<SudoActionResult> {
  return withSudoContext(tempSessionId, recaptcha, async (ctx) => {
    const result = await verifier(ctx);
    if (!result.ok) {
      const blocked = await reserveAttempt("tempSession", ctx.tempSession.id);
      return fail(blocked || result.error || "Verification failed.");
    }

    return await completeSudoSuccess(ctx);
  });
}

function decodePublicKey(raw: string): Uint8Array<ArrayBuffer> {
  const encoding = raw.includes("-") || raw.includes("_") ? "base64url" : "base64";
  const buf = Buffer.from(raw, encoding);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Uint8Array(ab) as unknown as Uint8Array<ArrayBuffer>;
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
      const credential = await getPasswordCredential(tempSession.user_id);

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
      getUserPasskeys(tempSession.user_id),
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

    await updateTempSession(tempSession.id, {
      challenge: options.challenge,
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

    await updateTempSession(tempSession.id, { challenge: null });

    const passkeyMatch = await findPasskeyByCredentialId(payload.id);
    const passkey = passkeyMatch?.passkey;
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

    await updatePasskey(tempSession.user_id, passkey.id, {
      sign_count: verification.authenticationInfo.newCounter,
      last_used_on: new Date(),
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
      const emails = await getUserEmails(tempSession.user_id);
      const primaryEmail = emails.find((e) => e.is_primary) || emails[0];

      if (!primaryEmail) {
        return fail("No primary email found for this account.");
      }

      const rawCode = Array.from({ length: 6 }, () => crypto.randomInt(0, 10)).join("");

      await updateTempSession(tempSession.id, {
        code_hash: await hashCode(rawCode),
        destination: primaryEmail.address,
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
      const totp = await getTotpMethod(tempSession.user_id);

      if (!totp) {
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

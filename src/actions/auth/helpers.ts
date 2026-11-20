import "server-only";

import crypto from "crypto";
import { getUserByUsername, getUserEmails } from "@/lib/users";
import {
  incrementFailedAttempts,
  updatePasswordCredential,
  resetFailedAttempts as resetPasswordFailedAttempts,
  findLinkedOAuthAccount,
  upsertLinkedOAuthAccount,
} from "@/lib/credentials";
import {
  getUserSession,
  getTempSession,
  updateTempSession,
} from "@/lib/session";
import { hashPassword } from "@/lib/security/hash";
import { getEnv } from "@/utils/env.server";
import type { VerificationMethod } from "@/types/auth.types";
import type { DBTempSession } from "@/types/session.types";
import type { ExternalAuthProfile, UserWithAuthRelations } from "./auth";

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const SESSION_INVALID_MESSAGE = "Session expired or invalid. Please sign in again.";
const SUDO_FLOW = "sudo";

type AttemptTarget = "password" | "tempSession";

export const verificationMethodMap: Record<string, VerificationMethod> = {
  passkeys: { id: "passkeys", type: "passkey", name: "Passkey" },
  totp: { id: "totp", type: "totp", name: "Authenticator App" },
  email: { id: "email", type: "code", name: "Email Code" },
};

export const USER_WITH_AUTH_INCLUDE = {
  account_status: true,
  preferences: true,
  emails: true,
  two_factor: true,
} as const;

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function requireUserSession() {
  const sessionData = await getUserSession();
  if (!sessionData) throw new Error("Unauthorized");
  return sessionData;
}

export async function requireValidTempSession(
  tempSessionId: string
): Promise<DBTempSession> {
  const tempSession = tempSessionId ? await getTempSession(tempSessionId) : null;
  if (
    !tempSession ||
    new Date(tempSession.expires_on) < new Date() ||
    tempSession.flow_type === SUDO_FLOW
  ) {
    throw new Error(SESSION_INVALID_MESSAGE);
  }
  return tempSession;
}

export function checkLockout(
  lockedUntil: Date | null | undefined,
  messagePrefix = "Too many failed attempts"
): string | null {
  if (!lockedUntil || new Date(lockedUntil) <= new Date()) return null;
  const minutesLeft = Math.max(
    1,
    Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000)
  );
  return `${messagePrefix}. Try again in ${minutesLeft} ${
    minutesLeft === 1 ? "minute" : "minutes"
  }.`;
}

export async function handleFailedAttempt(
  target: AttemptTarget,
  id: string
): Promise<number> {
  if (target === "password") {
    const { failed_attempts } = await incrementFailedAttempts(id);
    if (failed_attempts >= MAX_ATTEMPTS) {
      await updatePasswordCredential(id, {
        locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS),
      });
    }
    return failed_attempts;
  } else {
    const current = await getTempSession(id);
    const attempts = (current?.failed_attempts ?? 0) + 1;
    const lock = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
    await updateTempSession(id, {
      failed_attempts: attempts,
      locked_until: lock,
    });
    return attempts;
  }
}

export async function reserveAttempt(
  target: AttemptTarget,
  id: string,
  messagePrefix?: string
): Promise<string | null> {
  const attempts = await handleFailedAttempt(target, id);
  if (attempts <= MAX_ATTEMPTS) return null;
  return checkLockout(new Date(Date.now() + LOCKOUT_DURATION_MS), messagePrefix);
}

export async function resetFailedAttempts(
  target: AttemptTarget,
  id: string
): Promise<void> {
  if (target === "password") {
    await resetPasswordFailedAttempts(id);
  } else {
    await updateTempSession(id, {
      failed_attempts: 0,
      locked_until: null,
    });
  }
}

export async function markTempSessionVerified(
  tempSessionId: string,
  clearCodeHash = false
) {
  await updateTempSession(tempSessionId, {
    two_step_processed: true,
    failed_attempts: 0,
    locked_until: null,
    challenge: null,
    ...(clearCodeHash ? { code_hash: null } : {}),
  });
}

export const oauthAccountKey = (profile: ExternalAuthProfile) => ({
  provider_provider_user_id: {
    provider: profile.provider.toLowerCase(),
    provider_user_id: profile.providerUserId,
  },
});

export async function getOAuthAccountOwnerId(
  profile: ExternalAuthProfile
): Promise<string | null> {
  const res = await findLinkedOAuthAccount(profile.provider, profile.providerUserId);
  return res?.userId ?? null;
}

export async function upsertOAuthAccount(
  userId: string,
  profile: ExternalAuthProfile
) {
  return upsertLinkedOAuthAccount(userId, {
    provider: profile.provider.toLowerCase(),
    provider_user_id: profile.providerUserId,
    access_token: profile.accessToken,
    refresh_token: profile.refreshToken,
    expires_at: profile.expiresAt,
  });
}

async function hasVerifiedEmail(user: UserWithAuthRelations): Promise<boolean> {
  if (user.emails?.some((email) => email.verified)) return true;
  const emails = await getUserEmails(user.id);
  return emails.some((e) => e.verified);
}

export async function getAvailableMethods(
  user: UserWithAuthRelations
): Promise<VerificationMethod[]> {
  const twoFactor = user.two_factor;
  if (!twoFactor) return [];

  const { rpID } = await getWebAuthnConfig();
  const methods: VerificationMethod[] = [];

  if (twoFactor.passkeys?.some((p) => !p.rp_id || p.rp_id === rpID)) {
    methods.push(verificationMethodMap.passkeys);
  }
  if (twoFactor.totp && (twoFactor.totp.enabled ?? true)) {
    methods.push(verificationMethodMap.totp);
  }

  const hasEmailMethod = Boolean(twoFactor.email || twoFactor.email_id);
  if (hasEmailMethod || (methods.length > 0 && (await hasVerifiedEmail(user)))) {
    methods.push(verificationMethodMap.email);
  }

  return methods;
}

function parseUrl(value: string) {
  try {
    const parsed = new URL(value);
    return { origin: parsed.origin, host: parsed.hostname.toLowerCase() };
  } catch {
    return null;
  }
}

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
];
const DEV_RP_IDS = ["localhost", "127.0.0.1"];

export async function getWebAuthnConfig() {
  const rawBase = getEnv("NEXT_PUBLIC_BASE_URL", true) || "http://localhost:3000";
  const base = parseUrl(rawBase);
  const canonicalOrigin = base?.origin ?? rawBase.replace(/\/+$/, "");
  const canonicalHost = base?.host ?? "localhost";

  const envRpID = getEnv("NEXT_PUBLIC_RP_ID", true).trim().toLowerCase();
  const rpID =
    envRpID || (canonicalHost === "127.0.0.1" ? "localhost" : canonicalHost);

  const origins = new Set<string>([canonicalOrigin]);
  const rpIDs = new Set<string>([rpID, canonicalHost]);

  if (getEnv("NODE_ENV", true) !== "production") {
    DEV_ORIGINS.forEach((origin) => origins.add(origin));
    DEV_RP_IDS.forEach((id) => rpIDs.add(id));

    const dev = parseUrl(getEnv("NEXT_PUBLIC_DEV_URL", true).trim());
    if (dev) {
      origins.add(dev.origin);
      rpIDs.add(dev.host);
    }
  }

  return {
    rpID,
    origin: canonicalOrigin,
    expectedOrigin: Array.from(origins),
    expectedRPID: Array.from(rpIDs),
  };
}

const randomSuffix = (bytes: number) => crypto.randomBytes(bytes).toString("hex");

export async function generateUniqueUsername(
  baseInput?: string | null
): Promise<string> {
  const base =
    (baseInput || "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
  let candidate = base;

  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await getUserByUsername(candidate);
    if (!existing) return candidate;
    candidate = `${base}_${randomSuffix(3)}`;
  }

  return `${base}_${randomSuffix(4)}`;
}

let dummyPasswordHash: Promise<string> | null = null;

export function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword(randomSuffix(16));
  return dummyPasswordHash;
}

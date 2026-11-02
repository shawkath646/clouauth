import "server-only";

import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getUserSession, getTempSession } from "@/lib/session";
import { hashPassword } from "@/lib/security/hash";
import { getEnv } from "@/utils/utils";
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
  emails: {
    select: { id: true, address: true, is_primary: true, verified: true },
  },
  two_factor: {
    select: {
      passkeys: { select: { id: true, rp_id: true } },
      totp: { select: { id: true, enabled: true } },
      email: { select: { id: true } },
      email_id: true,
    },
  },
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
    tempSession.expires_on < new Date() ||
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
  if (!lockedUntil || lockedUntil <= new Date()) return null;
  const minutesLeft = Math.max(
    1,
    Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
  );
  return `${messagePrefix}. Try again in ${minutesLeft} ${
    minutesLeft === 1 ? "minute" : "minutes"
  }.`;
}

export async function handleFailedAttempt(
  target: AttemptTarget,
  id: string
): Promise<number> {
  const data = { failed_attempts: { increment: 1 } };
  const select = { failed_attempts: true } as const;

  const { failed_attempts: attempts } =
    target === "password"
      ? await prisma.passwordCredential.update({ where: { user_id: id }, data, select })
      : await prisma.tempSession.update({ where: { id }, data, select });

  if (attempts >= MAX_ATTEMPTS) {
    const lock = { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) };
    if (target === "password") {
      await prisma.passwordCredential.update({ where: { user_id: id }, data: lock });
    } else {
      await prisma.tempSession.update({ where: { id }, data: lock });
    }
  }

  return attempts;
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
  const data = { failed_attempts: 0, locked_until: null };
  if (target === "password") {
    await prisma.passwordCredential.update({ where: { user_id: id }, data });
  } else {
    await prisma.tempSession.update({ where: { id }, data });
  }
}

export async function markTempSessionVerified(
  tempSessionId: string,
  clearCodeHash = false
) {
  await prisma.tempSession.update({
    where: { id: tempSessionId },
    data: {
      two_step_processed: true,
      failed_attempts: 0,
      locked_until: null,
      challenge: null,
      ...(clearCodeHash ? { code_hash: null } : {}),
    },
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
  const account = await prisma.oAuthAccount.findUnique({
    where: oauthAccountKey(profile),
    select: { user_id: true },
  });
  return account?.user_id ?? null;
}

export async function upsertOAuthAccount(
  userId: string,
  profile: ExternalAuthProfile
) {
  const tokens = {
    access_token: profile.accessToken,
    refresh_token: profile.refreshToken,
    expires_at: profile.expiresAt,
  };

  return prisma.oAuthAccount.upsert({
    where: oauthAccountKey(profile),
    update: tokens,
    create: {
      user_id: userId,
      provider: profile.provider.toLowerCase(),
      provider_user_id: profile.providerUserId,
      ...tokens,
    },
  });
}

async function hasVerifiedEmail(user: UserWithAuthRelations): Promise<boolean> {
  if (user.emails?.some((email) => email.verified)) return true;
  const found = await prisma.userEmail.findFirst({
    where: { user_id: user.id, verified: true },
    select: { id: true },
  });
  return Boolean(found);
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

  if (process.env.NODE_ENV !== "production") {
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
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
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
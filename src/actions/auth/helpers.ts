import prisma from "@/lib/prisma";
import { getUserSession, getTempSession } from "@/lib/session";
import { getEnv } from "@/utils/env";
import { VerificationMethod } from "@/types/auth.types";
import type { ExternalAuthProfile } from "./auth";
import type { DBTempSession } from "@/types/session.types";
import crypto from "crypto";

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export const verificationMethodMap: Record<string, VerificationMethod> = {
  passkeys: { id: "passkeys", type: "passkey", name: "Passkey" },
  totp: { id: "totp", type: "totp", name: "Authenticator App" },
  email: { id: "email", type: "code", name: "Email Code" },
};

export const USER_WITH_AUTH_INCLUDE = {
  account_status: true,
  preferences: true,
  two_factor: {
    select: {
      passkeys: { select: { id: true } },
      totp: { select: { id: true, enabled: true } },
      email: { select: { id: true } },
      email_id: true,
    },
  },
} as const;

export async function requireUserSession() {
  const sessionData = await getUserSession();
  if (!sessionData) {
    throw new Error("Unauthorized");
  }
  return sessionData;
}

export async function requireValidTempSession(tempSessionId: string): Promise<DBTempSession> {
  if (!tempSessionId) {
    throw new Error("Session expired or invalid. Please sign in again.");
  }
  const tempSession = await getTempSession(tempSessionId);
  if (!tempSession || tempSession.expires_on < new Date()) {
    throw new Error("Session expired or invalid. Please sign in again.");
  }
  return tempSession;
}

export function checkLockout(
  lockedUntil: Date | null | undefined,
  messagePrefix = "Too many failed attempts"
): string | null {
  if (lockedUntil && lockedUntil > new Date()) {
    const minutesLeft = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
    return `${messagePrefix}. Try again in ${minutesLeft} minutes.`;
  }
  return null;
}

export async function handleFailedAttempt(
  target: "password" | "tempSession",
  id: string
): Promise<number> {
  if (target === "password") {
    const updated = await prisma.passwordCredential.update({
      where: { user_id: id },
      data: { failed_attempts: { increment: 1 } },
    });
    if (updated.failed_attempts >= MAX_ATTEMPTS) {
      await prisma.passwordCredential.update({
        where: { user_id: id },
        data: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) },
      });
    }
    return updated.failed_attempts;
  } else {
    const updated = await prisma.tempSession.update({
      where: { id },
      data: { failed_attempts: { increment: 1 } },
    });
    if (updated.failed_attempts >= MAX_ATTEMPTS) {
      await prisma.tempSession.update({
        where: { id },
        data: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) },
      });
    }
    return updated.failed_attempts;
  }
}

export async function resetFailedAttempts(
  target: "password" | "tempSession",
  id: string
): Promise<void> {
  if (target === "password") {
    await prisma.passwordCredential.update({
      where: { user_id: id },
      data: { failed_attempts: 0, locked_until: null },
    });
  } else {
    await prisma.tempSession.update({
      where: { id },
      data: { failed_attempts: 0, locked_until: null },
    });
  }
}

export async function markTempSessionVerified(tempSessionId: string, clearCodeHash = false) {
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

export async function upsertOAuthAccount(userId: string, profile: ExternalAuthProfile) {
  return prisma.oAuthAccount.upsert({
    where: {
      provider_provider_user_id: {
        provider: profile.provider.toLowerCase(),
        provider_user_id: profile.providerUserId,
      },
    },
    update: {
      user_id: userId,
      access_token: profile.accessToken,
      refresh_token: profile.refreshToken,
      expires_at: profile.expiresAt,
    },
    create: {
      user_id: userId,
      provider: profile.provider.toLowerCase(),
      provider_user_id: profile.providerUserId,
      access_token: profile.accessToken,
      refresh_token: profile.refreshToken,
      expires_at: profile.expiresAt,
    },
  });
}

export function getWebAuthnConfig() {
  const rawOrigin = getEnv("NEXT_PUBLIC_BASE_URL", true) || "http://localhost:3000";
  const origin = rawOrigin.replace(/\/+$/, "");
  const devUrl = getEnv("NEXT_PUBLIC_DEV_URL", true).replace(/\/+$/, "");
  const isDev = process.env.NODE_ENV !== "production";

  let originHost = "localhost";
  try {
    originHost = new URL(origin).hostname;
  } catch {
    originHost = "localhost";
  }

  const envRpID = getEnv("NEXT_PUBLIC_RP_ID", true).trim();

  // Determine a valid RP ID:
  // In WebAuthn, rpId MUST be equal to or a registrable domain suffix of the origin domain.
  // In development against localhost/127.0.0.1, rpID MUST be "localhost".
  let rpID = envRpID;
  if (!rpID || (isDev && (originHost === "localhost" || originHost === "127.0.0.1"))) {
    rpID = "localhost";
  } else if (!rpID) {
    rpID = originHost;
  }

  const expectedOriginSet = new Set<string>();
  expectedOriginSet.add(origin);
  if (isDev) {
    expectedOriginSet.add("http://localhost:3000");
    expectedOriginSet.add("http://127.0.0.1:3000");
  }
  if (devUrl) {
    expectedOriginSet.add(devUrl);
  }

  const expectedRPIDSet = new Set<string>();
  expectedRPIDSet.add(rpID);
  expectedRPIDSet.add(originHost);
  if (envRpID) expectedRPIDSet.add(envRpID);
  if (isDev) expectedRPIDSet.add("localhost");
  if (devUrl) {
    try {
      expectedRPIDSet.add(new URL(devUrl).hostname);
    } catch {
      // Ignore URL parse error
    }
  }

  return {
    rpID,
    origin,
    expectedOrigin: Array.from(expectedOriginSet),
    expectedRPID: Array.from(expectedRPIDSet),
  };
}

export async function generateUniqueUsername(baseInput?: string | null): Promise<string> {
  const clean = (baseInput || "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
  let username = clean;
  let retries = 0;
  while (retries < 5) {
    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!existing) return username;
    username = `${clean}_${crypto.randomBytes(3).toString("hex")}`;
    retries++;
  }
  return `${clean}_${crypto.randomBytes(4).toString("hex")}`;
}

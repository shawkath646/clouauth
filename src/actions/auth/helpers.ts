import prisma from "@/lib/prisma";
import { getUserSession, getTempSession } from "@/lib/session";
import { getEnv } from "@/utils/env";
import { VerificationMethod } from "@/types/auth.types";
import type { ExternalAuthProfile } from "./auth";
import type { DBTempSession } from "@/types/session.types";
import { headers } from "next/headers";
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
      passkeys: { select: { id: true, rp_id: true } },
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

export async function getWebAuthnConfig() {
  const isDev = process.env.NODE_ENV !== "production";
  const rawOrigin = getEnv("NEXT_PUBLIC_BASE_URL", true) || "http://localhost:3000";
  let origin = rawOrigin.replace(/\/+$/, "");
  const devUrl = getEnv("NEXT_PUBLIC_DEV_URL", true).replace(/\/+$/, "");
  const envRpID = getEnv("NEXT_PUBLIC_RP_ID", true).trim();

  let reqHost = "";
  let reqOrigin = "";

  try {
    const h = await headers();
    const forwardedHost = h.get("x-forwarded-host");
    const host = forwardedHost || h.get("host");
    const proto = h.get("x-forwarded-proto") || (isDev ? "http" : "https");
    if (host) {
      reqHost = host.split(":")[0].toLowerCase();
      reqOrigin = `${proto}://${host}`.replace(/\/+$/, "");
    }
    const originHdr = h.get("origin");
    if (originHdr) {
      reqOrigin = originHdr.replace(/\/+$/, "");
      try {
        reqHost = new URL(originHdr).hostname.toLowerCase();
      } catch {}
    }
  } catch {
    // Outside request context (e.g. background tasks or unit tests)
  }

  // Determine effective host
  let originHost = "localhost";
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    originHost = "localhost";
  }

  const effectiveHost = reqHost || originHost;

  if (reqOrigin) {
    origin = reqOrigin;
  }

  // Determine a valid RP ID:
  // In WebAuthn, rpId MUST be equal to or a registrable domain suffix of the origin domain.
  // 1. If effectiveHost is localhost or 127.0.0.1, rpID MUST be "localhost".
  // 2. If effectiveHost matches or ends with envRpID (e.g. auth.clouburstlab.com with clouburstlab.com), use envRpID.
  // 3. Otherwise extract registrable suffix or fallback to effectiveHost.
  let rpID = "localhost";
  if (effectiveHost === "localhost" || effectiveHost === "127.0.0.1") {
    rpID = "localhost";
  } else if (envRpID && (effectiveHost === envRpID || effectiveHost.endsWith(`.${envRpID}`))) {
    rpID = envRpID;
  } else if (envRpID && isDev) {
    rpID = "localhost";
  } else if (envRpID) {
    rpID = envRpID;
  } else {
    const parts = effectiveHost.split(".");
    if (parts.length > 2) {
      rpID = parts.slice(-2).join(".");
    } else {
      rpID = effectiveHost;
    }
  }

  const expectedOriginSet = new Set<string>();
  expectedOriginSet.add(origin);
  if (rawOrigin) expectedOriginSet.add(rawOrigin.replace(/\/+$/, ""));
  if (reqOrigin) expectedOriginSet.add(reqOrigin);
  if (isDev) {
    expectedOriginSet.add("http://localhost:3000");
    expectedOriginSet.add("http://127.0.0.1:3000");
    expectedOriginSet.add("http://localhost:3001");
  }
  if (devUrl) {
    expectedOriginSet.add(devUrl);
  }

  const expectedRPIDSet = new Set<string>();
  expectedRPIDSet.add(rpID);
  expectedRPIDSet.add(effectiveHost);
  if (envRpID) expectedRPIDSet.add(envRpID);
  if (isDev) expectedRPIDSet.add("localhost");
  if (devUrl) {
    try {
      expectedRPIDSet.add(new URL(devUrl).hostname.toLowerCase());
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

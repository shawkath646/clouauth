import "server-only";

import crypto from "crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import { toDate, toNullableDate } from "@/utils/date-time";
import { getUser, getUserEmails, getUserPreferences, getUserPhones } from "@/lib/users";
import { getOAuthConsent } from "@/lib/oauth/clients";
import {
  COOKIE_SESSION_TOKEN_NAME,
  COOKIE_REFRESH_TOKEN_NAME,
  REFRESH_TOKEN_TTL,
  REFRESH_TOKEN_TTL_REMEMBER_ME,
  SESSION_TOKEN_TTL,
  TEMP_SESSION_TTL_MS,
  DEVICE_ID_COOKIE_NAME,
  DEVICE_ID_COOKIE_MAX_AGE,
} from "@/constants/session.constants";
import { handleError } from "@/utils/error";
import type {
  SessionData,
  SafeDBUserSession,
  DBTempSession,
  DBUserSession,
} from "@/types/session.types";
import { generateId } from "@/utils/utils";
import { getSecureCookieOptions } from "@/utils/cookie.server";
import { getEnv } from "@/utils/env.server";
import { jwtSecret as secret } from "@/utils/jwt.server";

const issuer = getEnv("NEXT_PUBLIC_BASE_URL");

const REFRESH_GRACE_MS = 120 * 1000;
const REMEMBER_ME_THRESHOLD_MS =
  ((REFRESH_TOKEN_TTL + REFRESH_TOKEN_TTL_REMEMBER_ME) / 2) * 1000;

const SESSION_RESOLVE_TIMEOUT_MS = 5000;

const ACCESS_TOKEN_TTL_S = 3600;
const OAUTH_REFRESH_TOKEN_TTL_S = 30 * 24 * 3600;
const DEFAULT_USER_SCOPE = "openid profile email";
const DEFAULT_SERVICE_SCOPE = "internal_service";

const generateRandomValue = () => crypto.randomBytes(32).toString("hex");
const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

function timingSafeEqualStr(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function parseToken(token: unknown): { id: string; value: string } | null {
  if (typeof token !== "string") return null;
  const [id, value, ...rest] = token.split(".");
  return id && value && rest.length === 0 ? { id, value } : null;
}

const SECRET_SESSION_FIELDS = [
  "session_token_hash",
  "refresh_token_hash",
  "previous_refresh_token_hash",
] as const;

function sanitizeSession(session: DBUserSession): SafeDBUserSession {
  const safe: Partial<DBUserSession> = { ...session };
  for (const field of SECRET_SESSION_FIELDS) delete safe[field];
  return safe as SafeDBUserSession;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[Session] Resolution exceeded ${timeoutMs}ms; treating as signed out`);
      resolve(fallback);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function getRequestMeta() {
  try {
    const h = await headers();
    return {
      userAgent: h.get("user-agent") || null,
      ipAddress:
        h.get("x-forwarded-for")?.split(",")[0].trim() ||
        h.get("x-real-ip") ||
        null,
    };
  } catch {
    return { userAgent: null, ipAddress: null };
  }
}

const BROWSER_RULES: [RegExp, string][] = [
  [/Edg\/([0-9.]+)/, "Edge"],
  [/Chrome\/([0-9.]+)/, "Chrome"],
  [/Firefox\/([0-9.]+)/, "Firefox"],
  [/Safari\/([0-9.]+)/, "Safari"],
];

const DEVICE_RULES: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android Device"],
  [/Windows/, "Windows PC"],
  [/Macintosh/, "Mac"],
  [/Linux/, "Linux PC"],
];

function matchRule(ua: string, rules: [RegExp, string][]): string | null {
  for (const [regex, label] of rules) {
    if (regex.test(ua)) return label;
  }
  return null;
}

async function getOrCreateDeviceId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(DEVICE_ID_COOKIE_NAME)?.value;
  if (existing) return existing;

  const newId = generateRandomValue();
  cookieStore.set(
    DEVICE_ID_COOKIE_NAME,
    newId,
    getSecureCookieOptions({ maxAge: DEVICE_ID_COOKIE_MAX_AGE })
  );
  return newId;
}

function mintTokens(rememberMe: boolean = false, baseExpiry?: Date) {
  const now = new Date();
  const sessionTokenVal = generateRandomValue();
  const refreshTokenVal = generateRandomValue();

  const ttl = rememberMe ? REFRESH_TOKEN_TTL_REMEMBER_ME : REFRESH_TOKEN_TTL;
  const sessionExpiresOn = new Date(now.getTime() + SESSION_TOKEN_TTL * 1000);
  const refreshExpiresOn = baseExpiry ?? new Date(now.getTime() + ttl * 1000);

  return {
    sessionTokenVal,
    refreshTokenVal,
    sessionHash: hashToken(sessionTokenVal),
    refreshHash: hashToken(refreshTokenVal),
    sessionExpiresOn,
    refreshExpiresOn,
    ttl,
    toSessionData(sessionId: string): SessionData {
      return {
        sessionToken: `${sessionId}.${sessionTokenVal}`,
        refreshToken: `${sessionId}.${refreshTokenVal}`,
        sessionExpiresOn,
        refreshExpiresOn,
      };
    },
  };
}

async function setSessionCookies(tokens: SessionData, refreshTtl: number) {
  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_SESSION_TOKEN_NAME,
    tokens.sessionToken,
    getSecureCookieOptions({ maxAge: SESSION_TOKEN_TTL })
  );
  cookieStore.set(
    COOKIE_REFRESH_TOKEN_NAME,
    tokens.refreshToken,
    getSecureCookieOptions({ maxAge: refreshTtl })
  );
}

async function clearSessionCookies() {
  try {
    const cookieStore = await cookies();
    const options = getSecureCookieOptions({ maxAge: 0 });
    cookieStore.set(COOKIE_SESSION_TOKEN_NAME, "", options);
    cookieStore.set(COOKIE_REFRESH_TOKEN_NAME, "", options);
  } catch {
    // Cannot modify cookies during Server Component rendering; ignored safely
  }
}

function matchRefreshToken(
  session: DBUserSession,
  presentedHash: string
): "current" | "previous" | null {
  if (timingSafeEqualStr(session.refresh_token_hash, presentedHash)) return "current";
  if (
    timingSafeEqualStr(session.previous_refresh_token_hash, presentedHash) &&
    new Date(session.updated_on).getTime() + REFRESH_GRACE_MS > Date.now()
  ) {
    return "previous";
  }
  return null;
}

const isRememberMeSession = (session: DBUserSession) =>
  new Date(session.expires_on).getTime() - new Date(session.created_on).getTime() > REMEMBER_ME_THRESHOLD_MS;

// Session Database Helpers (Direct Firestore)
export async function findSessionById(sessionId: string): Promise<DBUserSession | null> {
  try {
    const doc = await db.collection("user_sessions").doc(sessionId).get();
    if (!doc.exists) return null;
    const d = doc.data()!;
    return {
      id: doc.id,
      user_id: d.user_id,
      session_token_hash: d.session_token_hash,
      refresh_token_hash: d.refresh_token_hash,
      previous_refresh_token_hash: d.previous_refresh_token_hash ?? null,
      created_on: toDate(d.created_on),
      updated_on: toDate(d.updated_on),
      last_authenticated_on: toDate(d.last_authenticated_on),
      session_expires_on: toDate(d.session_expires_on),
      expires_on: toDate(d.expires_on),
      revoked_on: toNullableDate(d.revoked_on),
      ip_address: d.ip_address ?? null,
      user_agent: d.user_agent ?? null,
      device_name: d.device_name ?? null,
      device_fingerprint: d.device_fingerprint ?? null,
    };
  } catch (error) {
    console.error("[Session] Error querying session:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function getUserSessions(userId: string): Promise<DBUserSession[]> {
  const snap = await db.collection("user_sessions").where("user_id", "==", userId).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      user_id: data.user_id,
      session_token_hash: data.session_token_hash,
      refresh_token_hash: data.refresh_token_hash,
      previous_refresh_token_hash: data.previous_refresh_token_hash ?? null,
      created_on: toDate(data.created_on),
      updated_on: toDate(data.updated_on),
      last_authenticated_on: toDate(data.last_authenticated_on),
      session_expires_on: toDate(data.session_expires_on),
      expires_on: toDate(data.expires_on),
      revoked_on: toNullableDate(data.revoked_on),
      ip_address: data.ip_address ?? null,
      user_agent: data.user_agent ?? null,
      device_name: data.device_name ?? null,
      device_fingerprint: data.device_fingerprint ?? null,
    };
  });
}

export async function updateSession(sessionId: string, data: Partial<DBUserSession>): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    ...data,
    updated_on: Timestamp.now(),
  };
  if (data.session_expires_on) {
    updatePayload.session_expires_on = Timestamp.fromDate(new Date(data.session_expires_on));
  }
  if (data.expires_on) {
    updatePayload.expires_on = Timestamp.fromDate(new Date(data.expires_on));
  }
  if (data.last_authenticated_on) {
    updatePayload.last_authenticated_on = Timestamp.fromDate(new Date(data.last_authenticated_on));
  }
  if (data.revoked_on !== undefined) {
    updatePayload.revoked_on = data.revoked_on ? Timestamp.fromDate(new Date(data.revoked_on)) : null;
  }
  await db.collection("user_sessions").doc(sessionId).update(updatePayload);
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.collection("user_sessions").doc(sessionId).update({
    revoked_on: Timestamp.now(),
    updated_on: Timestamp.now(),
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const snap = await db.collection("user_sessions").where("user_id", "==", userId).get();
  if (snap.empty) return;
  const batch = db.batch();
  const now = Timestamp.now();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { revoked_on: now, updated_on: now });
  });
  await batch.commit();
}

export async function createSession(
  userId: string,
  rememberMe: boolean = false
): Promise<SessionData> {
  const tokens = mintTokens(rememberMe);
  const { userAgent, ipAddress } = await getRequestMeta();
  const deviceFingerprint = await getOrCreateDeviceId();
  const now = new Date();

  const ua = userAgent ?? "";
  const browserName = matchRule(ua, BROWSER_RULES);

  // Clean expired sessions
  const expiredSnap = await db
    .collection("user_sessions")
    .where("user_id", "==", userId)
    .where("expires_on", "<", now)
    .get();
  if (!expiredSnap.empty) {
    const batch = db.batch();
    expiredSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit().catch(() => {});
  }

  const sessionFields = {
    session_token_hash: tokens.sessionHash,
    refresh_token_hash: tokens.refreshHash,
    session_expires_on: tokens.sessionExpiresOn,
    expires_on: tokens.refreshExpiresOn,
    last_authenticated_on: now,
    device_name: matchRule(ua, DEVICE_RULES),
    user_agent: browserName || userAgent,
    ip_address: ipAddress,
  };

  const devSnap = await db
    .collection("user_sessions")
    .where("user_id", "==", userId)
    .where("device_fingerprint", "==", deviceFingerprint)
    .limit(1)
    .get();

  let sessionId: string;
  if (!devSnap.empty) {
    const existing = devSnap.docs[0];
    sessionId = existing.id;
    await updateSession(sessionId, {
      ...sessionFields,
      previous_refresh_token_hash: null,
      revoked_on: null,
    });
  } else {
    sessionId = generateId();
    const docData = {
      id: sessionId,
      user_id: userId,
      device_fingerprint: deviceFingerprint,
      ...sessionFields,
      previous_refresh_token_hash: null,
      revoked_on: null,
      created_on: Timestamp.now(),
      updated_on: Timestamp.now(),
      session_expires_on: Timestamp.fromDate(tokens.sessionExpiresOn),
      expires_on: Timestamp.fromDate(tokens.refreshExpiresOn),
      last_authenticated_on: Timestamp.fromDate(now),
    };
    await db.collection("user_sessions").doc(sessionId).set(docData);
  }

  const sessionData = tokens.toSessionData(sessionId);
  await setSessionCookies(sessionData, tokens.ttl);
  return sessionData;
}

export async function refreshSession(
  presentedRefreshToken: string,
  setCookies: boolean = true
): Promise<SessionData> {
  const parsed = parseToken(presentedRefreshToken);
  if (!parsed) throw new Error("invalid_token_format");

  const presentedHash = hashToken(parsed.value);
  const session = await findSessionById(parsed.id);

  if (!session) throw new Error("invalid_grant");
  if (session.revoked_on) throw new Error("session_revoked");
  if (new Date(session.expires_on) < new Date()) throw new Error("session_expired");

  const match = matchRefreshToken(session, presentedHash);
  if (!match) {
    await revokeSession(session.id);
    throw new Error("invalid_grant");
  }
  if (match === "previous") throw new Error("concurrent_refresh");

  const tokens = mintTokens(isRememberMeSession(session), new Date(session.expires_on));

  await updateSession(session.id, {
    session_token_hash: tokens.sessionHash,
    refresh_token_hash: tokens.refreshHash,
    previous_refresh_token_hash: session.refresh_token_hash,
    session_expires_on: tokens.sessionExpiresOn,
  });

  const sessionData = tokens.toSessionData(session.id);
  if (setCookies) await setSessionCookies(sessionData, tokens.ttl);
  return sessionData;
}

const isSessionTokenValid = (session: DBUserSession, hash: string) =>
  new Date(session.session_expires_on) >= new Date() &&
  timingSafeEqualStr(session.session_token_hash, hash);

const isRefreshTokenValid = (session: DBUserSession, hash: string) =>
  new Date(session.expires_on) >= new Date() && matchRefreshToken(session, hash) !== null;

async function resolveUserSession(
  token: string,
  isValid: (session: DBUserSession, tokenHash: string) => boolean,
  label: string
) {
  const parsed = parseToken(token);
  if (!parsed) return null;

  try {
    const row = await findSessionById(parsed.id);
    if (!row || row.revoked_on || !isValid(row, hashToken(parsed.value))) {
      return null;
    }

    const user = await getUser(row.user_id);
    if (!user) return null;

    const [emails, preferences] = await Promise.all([
      getUserEmails(user.id),
      getUserPreferences(user.id),
    ]);

    const primaryEmail = emails.find((e) => e.is_primary) || emails[0];

    return {
      session: sanitizeSession(row),
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
        email: primaryEmail?.address ?? null,
        email_verified: Boolean(primaryEmail?.verified),
        language: preferences?.language ?? null,
        timezone: preferences?.timezone ?? null,
        theme: preferences?.theme ?? null,
      },
    };
  } catch (e: unknown) {
    handleError(e, `Failed to resolve ${label} user session`);
    return null;
  }
}

export type ResolvedUserSession = NonNullable<Awaited<ReturnType<typeof resolveUserSession>>>;

export async function getUserSessionByToken(sessionToken: string): Promise<ResolvedUserSession | null> {
  return resolveUserSession(sessionToken, isSessionTokenValid, "token");
}

export async function getUserSessionByRefreshToken(refreshToken: string): Promise<ResolvedUserSession | null> {
  return resolveUserSession(refreshToken, isRefreshTokenValid, "refresh");
}

export const getUserSession = cache(async () => {
  await connection();
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(COOKIE_SESSION_TOKEN_NAME)?.value;

    if (sessionToken) {
      const result = await withTimeout(
        resolveUserSession(sessionToken, isSessionTokenValid, "active"),
        SESSION_RESOLVE_TIMEOUT_MS,
        null
      );
      if (result) return result;
    }

    return null;
  } catch {
    return null;
  }
});

export const signOut = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_SESSION_TOKEN_NAME)?.value;
  const parsed = parseToken(sessionToken);

  if (parsed?.id) {
    await revokeSession(parsed.id);
  }

  await clearSessionCookies();
};

// Temp Sessions (Direct Firestore)
export async function createTempSession(
  userIdOrOptions:
    | string
    | {
        user_id: string;
        id?: string;
        rememberMe?: boolean;
        authMethod?: string;
        flowType?: string;
        flow_type?: string | null;
        payload?: string | null;
        challenge?: string | null;
        destination?: string | null;
        type?: string | null;
        code_hash?: string | null;
        failed_attempts?: number;
        expires_on?: Date;
        expiresOn?: Date;
      },
  options?:
    | boolean
    | {
        id?: string;
        rememberMe?: boolean;
        authMethod?: string;
        flowType?: string;
        flow_type?: string | null;
        payload?: string | null;
        challenge?: string | null;
        destination?: string | null;
        type?: string | null;
        code_hash?: string | null;
        failed_attempts?: number;
        expires_on?: Date;
        expiresOn?: Date;
      }
): Promise<DBTempSession> {
  const isObj = typeof userIdOrOptions === "object";
  const userId = isObj ? userIdOrOptions.user_id : userIdOrOptions;
  const rawOpts = isObj
    ? userIdOrOptions
    : typeof options === "boolean"
      ? { rememberMe: options }
      : options || {};
  const opts = rawOpts as Record<string, unknown>;

  const { userAgent, ipAddress } = await getRequestMeta();
  const id = (opts.id as string) || generateRandomValue();
  const expiresOn =
    ((opts.expires_on || opts.expiresOn) as Date) ||
    new Date(Date.now() + TEMP_SESSION_TTL_MS);

  const docData = {
    id,
    user_id: userId,
    auth_method: ((opts.authMethod || opts.auth_method) as string) || null,
    flow_type: ((opts.flowType || opts.flow_type) as string) || null,
    ip_address: ipAddress,
    user_agent: userAgent,
    payload: (opts.payload as string) ?? null,
    challenge: (opts.challenge as string) ?? null,
    destination: (opts.destination as string) ?? null,
    type: opts.type ?? null,
    code_hash: opts.code_hash ?? null,
    failed_attempts: opts.failed_attempts ?? 0,
    locked_until: null,
    remember_me: opts.rememberMe || opts.remember_me || false,
    two_step_processed: false,
    created_on: Timestamp.now(),
    expires_on: Timestamp.fromDate(expiresOn),
  };

  await db.collection("temp_sessions").doc(id).set(docData);

  return {
    ...docData,
    created_on: new Date(),
    expires_on: expiresOn,
  } as DBTempSession;
}

export async function getTempSession(tempSessionId: string): Promise<DBTempSession | null> {
  if (!tempSessionId) return null;
  const doc = await db.collection("temp_sessions").doc(tempSessionId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    id: doc.id,
    user_id: d.user_id,
    auth_method: d.auth_method ?? null,
    flow_type: d.flow_type ?? null,
    ip_address: d.ip_address ?? null,
    user_agent: d.user_agent ?? null,
    payload: d.payload ?? null,
    challenge: d.challenge ?? null,
    code_hash: d.code_hash ?? null,
    failed_attempts: d.failed_attempts ?? 0,
    locked_until: toNullableDate(d.locked_until),
    remember_me: d.remember_me ?? false,
    type: d.type ?? null,
    destination: d.destination ?? null,
    two_step_processed: d.two_step_processed ?? false,
    created_on: toDate(d.created_on),
    expires_on: toDate(d.expires_on),
  };
}

export async function updateTempSession(tempSessionId: string, data: Partial<DBTempSession>): Promise<void> {
  if (!tempSessionId) return;
  const updatePayload: Record<string, unknown> = { ...data };
  if (data.expires_on) {
    updatePayload.expires_on = Timestamp.fromDate(new Date(data.expires_on));
  }
  if (data.locked_until !== undefined) {
    updatePayload.locked_until = data.locked_until ? Timestamp.fromDate(new Date(data.locked_until)) : null;
  }
  await db.collection("temp_sessions").doc(tempSessionId).update(updatePayload);
}

export async function deleteTempSession(tempSessionId: string): Promise<void> {
  if (!tempSessionId) return;
  try {
    await db.collection("temp_sessions").doc(tempSessionId).delete();
  } catch (e: unknown) {
    handleError(e, "Failed to execute deleteTempSession");
  }
}

// Token Revocation (Direct Firestore)
export async function revokeToken(jti: string, expiresAt: Date): Promise<boolean> {
  if (!jti) return false;
  try {
    await db.collection("revoked_tokens").doc(jti).create({
      id: jti,
      jti,
      expires_at: Timestamp.fromDate(expiresAt),
      created_on: Timestamp.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  if (!jti) return false;
  const doc = await db.collection("revoked_tokens").doc(jti).get();
  return doc.exists;
}

// Expired Session Cleanup (Direct Firestore)
export async function cleanupExpiredSessions(): Promise<{ userSessions: number; tempSessions: number; revokedTokens: number }> {
  const now = Timestamp.now();

  const [expiredSessionsSnap, revokedSessionsSnap, tempSnap, tokenSnap] = await Promise.all([
    db.collection("user_sessions").where("expires_on", "<", now).get(),
    db.collection("user_sessions").where("revoked_on", "!=", null).get(),
    db.collection("temp_sessions").where("expires_on", "<", now).get(),
    db.collection("revoked_tokens").where("expires_at", "<", now).get(),
  ]);

  const sessionRefsToDelete = new Set<string>();
  expiredSessionsSnap.docs.forEach((d) => sessionRefsToDelete.add(d.id));
  revokedSessionsSnap.docs.forEach((d) => sessionRefsToDelete.add(d.id));

  const batch = db.batch();
  sessionRefsToDelete.forEach((id) => batch.delete(db.collection("user_sessions").doc(id)));
  tempSnap.docs.forEach((d) => batch.delete(d.ref));
  tokenSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();

  return {
    userSessions: sessionRefsToDelete.size,
    tempSessions: tempSnap.size,
    revokedTokens: tokenSnap.size,
  };
}
export const cleanupAllExpiredSessions = cleanupExpiredSessions;

// OAuth JWT Sessions
type OAuthTokenType = "access_token" | "refresh_token" | "client_credentials";

function signToken(params: {
  type: OAuthTokenType;
  sub: string;
  clientId: string;
  scope: string;
  ttlSeconds: number;
}) {
  const { type, sub, clientId, scope, ttlSeconds } = params;
  return new SignJWT({ sub, client_id: clientId, scope, type })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(clientId)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

const verifyOAuthToken = (token: string) =>
  jwtVerify(token, secret, { algorithms: ["HS256"], issuer });

export async function createOAuthSession(userId: string, clientId: string, scope: string) {
  const finalScope = scope || DEFAULT_USER_SCOPE;

  const [accessToken, refreshToken] = await Promise.all([
    signToken({
      type: "access_token",
      sub: userId,
      clientId,
      scope: finalScope,
      ttlSeconds: ACCESS_TOKEN_TTL_S,
    }),
    signToken({
      type: "refresh_token",
      sub: userId,
      clientId,
      scope: finalScope,
      ttlSeconds: OAUTH_REFRESH_TOKEN_TTL_S,
    }),
  ]);

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_S, scope: finalScope };
}

export async function createClientCredentialsSession(clientId: string, scope: string) {
  const finalScope = scope || DEFAULT_SERVICE_SCOPE;

  const accessToken = await signToken({
    type: "client_credentials",
    sub: clientId,
    clientId,
    scope: finalScope,
    ttlSeconds: ACCESS_TOKEN_TTL_S,
  });

  return { accessToken, tokenType: "Bearer", expiresIn: ACCESS_TOKEN_TTL_S, scope: finalScope };
}

export async function getOAuthSession(token: string) {
  try {
    const { payload } = await verifyOAuthToken(token);
    if (payload.type !== "access_token" || typeof payload.sub !== "string") return null;

    const clientId = String(payload.clientId || payload.client_id || "");

    const revoked = payload.jti ? await isTokenRevoked(payload.jti) : false;
    if (revoked) return null;

    const user = await getUser(payload.sub);
    if (!user) return null;

    const consent = clientId ? await getOAuthConsent(payload.sub, clientId) : null;
    if (clientId && (!consent || consent.revoked_at)) return null;

    const [emails, phones] = await Promise.all([
      getUserEmails(user.id),
      getUserPhones(user.id),
    ]);

    return {
      user: {
        ...user,
        emails: emails.filter((e) => e.is_primary),
        phones: phones.filter((p) => p.is_primary),
      },
      scopes: String(payload.scope ?? "").split(" ").filter(Boolean),
    };
  } catch {
    return null;
  }
}

export async function revokeOAuthSession(token: string) {
  try {
    const { payload } = await verifyOAuthToken(token);
    if (payload.jti && payload.exp) {
      await revokeToken(payload.jti, new Date(payload.exp * 1000));
    }
  } catch {
    return true;
  }
  return true;
}

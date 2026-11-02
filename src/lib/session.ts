import "server-only";

import crypto from "crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Prisma } from "@/generated/prisma/client";
import prisma from "./prisma";
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
import { getEnv, getSecureCookieOptions } from "@/utils/utils";

const issuer = getEnv("NEXT_PUBLIC_BASE_URL");
const secret = new TextEncoder().encode(getEnv("JWT_SECRET"));


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
        h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null,
    };
  } catch {
    return { userAgent: null, ipAddress: null };
  }
}

type Rule = [needles: string[], label: string];

const DEVICE_RULES: Rule[] = [
  [["Windows"], "Windows PC"],
  [["Macintosh"], "Mac"],
  [["iPhone"], "iPhone"],
  [["iPad"], "iPad"],
  [["Android"], "Android Device"],
  [["Linux"], "Linux PC"],
];

const BROWSER_RULES: Rule[] = [
  [["Edg"], "Edge"],
  [["OPR", "Opera"], "Opera"],
  [["Chrome"], "Chrome"],
  [["Firefox"], "Firefox"],
  [["Safari"], "Safari"],
];

const matchRule = (ua: string, rules: Rule[]) =>
  rules.find(([needles]) => needles.some((n) => ua.includes(n)))?.[1] ?? null;

async function getOrCreateDeviceId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(DEVICE_ID_COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  cookieStore.set(
    DEVICE_ID_COOKIE_NAME,
    id,
    getSecureCookieOptions({ maxAge: DEVICE_ID_COOKIE_MAX_AGE })
  );
  return id;
}

type Ttls = { session: number; refresh: number };

function getTtls(rememberMe: boolean): Ttls {
  return {
    session: SESSION_TOKEN_TTL,
    refresh: rememberMe ? REFRESH_TOKEN_TTL_REMEMBER_ME : REFRESH_TOKEN_TTL,
  };
}

function mintTokens(rememberMe: boolean, fixedRefreshExpiresOn?: Date) {
  const rawSession = generateRandomValue();
  const rawRefresh = generateRandomValue();
  const ttl = getTtls(rememberMe);
  const now = Date.now();

  const refreshExpiresOn =
    fixedRefreshExpiresOn ?? new Date(now + ttl.refresh * 1000);
  const refreshSeconds = Math.max(
    1,
    Math.floor((refreshExpiresOn.getTime() - now) / 1000)
  );
  const sessionSeconds = Math.min(ttl.session, refreshSeconds);
  const sessionExpiresOn = new Date(now + sessionSeconds * 1000);

  return {
    ttl: { session: sessionSeconds, refresh: refreshSeconds },
    sessionHash: hashToken(rawSession),
    refreshHash: hashToken(rawRefresh),
    sessionExpiresOn,
    refreshExpiresOn,
    toSessionData: (sessionId: string): SessionData => ({
      sessionToken: `${sessionId}.${rawSession}`,
      refreshToken: `${sessionId}.${rawRefresh}`,
      sessionExpiresOn,
      refreshExpiresOn,
    }),
  };
}

async function setSessionCookies(data: SessionData, ttl: Ttls) {
  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_SESSION_TOKEN_NAME,
    data.sessionToken,
    getSecureCookieOptions({ maxAge: ttl.session })
  );
  cookieStore.set(
    COOKIE_REFRESH_TOKEN_NAME,
    data.refreshToken,
    getSecureCookieOptions({ maxAge: ttl.refresh })
  );
}

async function clearSessionCookies() {
  const cookieStore = await cookies();
  const options = getSecureCookieOptions({ maxAge: 0 });
  cookieStore.set(COOKIE_SESSION_TOKEN_NAME, "", options);
  cookieStore.set(COOKIE_REFRESH_TOKEN_NAME, "", options);
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

  await prisma.userSession.deleteMany({
    where: { user_id: userId, expires_on: { lt: now } },
  });

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

  const existing = await prisma.userSession.findFirst({
    where: { user_id: userId, device_fingerprint: deviceFingerprint },
    select: { id: true },
  });

  const session = existing
    ? await prisma.userSession.update({
      where: { id: existing.id },
      data: { ...sessionFields, previous_refresh_token_hash: null, revoked_on: null },
      select: { id: true },
    })
    : await prisma.userSession.create({
      data: { ...sessionFields, user_id: userId, device_fingerprint: deviceFingerprint },
      select: { id: true },
    });

  const sessionData = tokens.toSessionData(session.id);
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
  const session = await prisma.userSession.findUnique({ where: { id: parsed.id } });

  if (!session) throw new Error("invalid_grant");
  if (session.revoked_on) throw new Error("session_revoked");
  if (session.expires_on < new Date()) throw new Error("session_expired");

  const match = matchRefreshToken(session, presentedHash);
  if (!match) {
    await revokeSession(session.id);
    throw new Error("invalid_grant");
  }
  if (match === "previous") throw new Error("concurrent_refresh");

  const tokens = mintTokens(isRememberMeSession(session), session.expires_on);

  const { count } = await prisma.userSession.updateMany({
    where: { id: session.id, refresh_token_hash: session.refresh_token_hash },
    data: {
      session_token_hash: tokens.sessionHash,
      refresh_token_hash: tokens.refreshHash,
      previous_refresh_token_hash: session.refresh_token_hash,
      session_expires_on: tokens.sessionExpiresOn,
    },
  });
  if (count === 0) throw new Error("concurrent_refresh");

  const sessionData = tokens.toSessionData(session.id);
  if (setCookies) await setSessionCookies(sessionData, tokens.ttl);
  return sessionData;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { id: sessionId },
    data: { revoked_on: new Date() },
  });
}

const SESSION_USER_SELECT = {
  id: true,
  username: true,
  first_name: true,
  last_name: true,
  avatar: true,
  emails: {
    where: { is_primary: true },
    select: { address: true, verified: true },
  },
  preferences: {
    select: { language: true, timezone: true, theme: true },
  },
} satisfies Prisma.UserSelect;

type SessionUserRow = Prisma.UserGetPayload<{ select: typeof SESSION_USER_SELECT }>;

function toSessionUser({ emails, preferences, ...user }: SessionUserRow) {
  return {
    ...user,
    email: emails[0]?.address ?? null,
    email_verified: Boolean(emails[0]?.verified),
    language: preferences?.language ?? null,
    timezone: preferences?.timezone ?? null,
    theme: preferences?.theme ?? null,
  };
}

const isSessionTokenValid = (session: DBUserSession, hash: string) =>
  session.session_expires_on >= new Date() &&
  timingSafeEqualStr(session.session_token_hash, hash);

const isRefreshTokenValid = (session: DBUserSession, hash: string) =>
  session.expires_on >= new Date() && matchRefreshToken(session, hash) !== null;

async function resolveUserSession(
  token: string,
  isValid: (session: DBUserSession, tokenHash: string) => boolean,
  label: string
) {
  const parsed = parseToken(token);
  if (!parsed) return null;

  try {
    const row = await prisma.userSession.findUnique({
      where: { id: parsed.id },
      include: { user: { select: SESSION_USER_SELECT } },
    });

    if (!row?.user || row.revoked_on || !isValid(row, hashToken(parsed.value))) {
      return null;
    }

    const { user, ...session } = row;
    return {
      session: sanitizeSession(session as DBUserSession),
      user: toSessionUser(user),
    };
  } catch (error) {
    console.warn(
      `[Session Resolution Warning] Failed to validate ${label} against database:`,
      (error as Error)?.message || error
    );
    return null;
  }
}

export const getUserSessionByToken = cache((sessionToken: string) =>
  resolveUserSession(sessionToken, isSessionTokenValid, "session token")
);

export const getUserSessionByRefreshToken = cache((refreshToken: string) =>
  resolveUserSession(refreshToken, isRefreshTokenValid, "refresh token")
);

export async function getSession(sessionToken: string): Promise<SafeDBUserSession | null> {
  return (await getUserSessionByToken(sessionToken))?.session ?? null;
}

export const getUserSession = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_SESSION_TOKEN_NAME)?.value;
  const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN_NAME)?.value;

  if (!sessionToken && !refreshToken) return null;

  const resolve = async () => {
    if (sessionToken) {
      const session = await getUserSessionByToken(sessionToken);
      if (session) return session;
    }
    return refreshToken ? getUserSessionByRefreshToken(refreshToken) : null;
  };

  return withTimeout(resolve(), SESSION_RESOLVE_TIMEOUT_MS, null);
};

async function getCurrentSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(COOKIE_SESSION_TOKEN_NAME)?.value ??
    cookieStore.get(COOKIE_REFRESH_TOKEN_NAME)?.value;
  return parseToken(token)?.id ?? null;
}

export async function signOut(sessionId?: string) {
  try {
    const id = sessionId ?? (await getCurrentSessionId());
    if (id) await revokeSession(id);
  } finally {
    await clearSessionCookies();
  }
}

export interface CreateTempSessionOptions {
  rememberMe?: boolean;
  authMethod?: string;
  flowType?: string;
  payload?: string;
}

export async function createTempSession(
  userId: string,
  options: boolean | CreateTempSessionOptions = false
): Promise<DBTempSession> {
  const opts: CreateTempSessionOptions =
    typeof options === "boolean" ? { rememberMe: options } : options;
  const { userAgent, ipAddress } = await getRequestMeta();

  return prisma.tempSession.create({
    data: {
      id: generateRandomValue(),
      user_id: userId,
      expires_on: new Date(Date.now() + TEMP_SESSION_TTL_MS),
      remember_me: opts.rememberMe ?? false,
      auth_method: opts.authMethod ?? null,
      flow_type: opts.flowType ?? null,
      payload: opts.payload ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
    },
  });
}

export async function getTempSession(tempSessionId: string): Promise<DBTempSession | null> {
  return prisma.tempSession.findUnique({ where: { id: tempSessionId } });
}

export async function deleteTempSession(tempSessionId: string): Promise<void> {
  try {
    await prisma.tempSession.deleteMany({ where: { id: tempSessionId } });
  } catch (e: unknown) {
    handleError(e, "Failed to execute deleteTempSession");
  }
}

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

    const [revoked, user, consent] = await Promise.all([
      payload.jti
        ? prisma.revokedToken.findUnique({ where: { jti: payload.jti }, select: { jti: true } })
        : null,
      prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          emails: { where: { is_primary: true } },
          phones: { where: { is_primary: true } },
        },
      }),
      clientId
        ? prisma.oAuthConsent.findUnique({
            where: {
              user_id_client_id: {
                user_id: payload.sub,
                client_id: clientId,
              },
            },
          })
        : null,
    ]);

    if (revoked || !user) return null;
    if (clientId && (!consent || consent.revoked_at)) return null;

    return {
      user,
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
      await prisma.revokedToken.upsert({
        where: { jti: payload.jti },
        update: {},
        create: { jti: payload.jti, expires_at: new Date(payload.exp * 1000) },
      });
    }
  } catch {
    return true;
  }
  return true;
}
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";
import {
  refreshSession,
  getUserSessionByToken,
  getUserSessionByRefreshToken,
} from "@/lib/session";
import { getSecureCookieOptions } from "@/utils/utils";
import type { SessionData } from "@/types/session.types";
import {
  COOKIE_REFRESH_TOKEN_NAME,
  COOKIE_SESSION_TOKEN_NAME,
} from "./constants/session.constants";

const API_PREFIX = "/api";
const PROTECTED_ROUTES = ["/profile"];
const NON_ROTATING_METHODS = new Set(["OPTIONS", "HEAD"]);
const DEAD_REFRESH_ERRORS = new Set([
  "invalid_grant",
  "session_revoked",
  "session_expired",
  "invalid_token_format",
]);

type Rotation =
  | { status: "none" }
  | { status: "dead" }
  | { status: "rotated"; data: SessionData };

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

const secondsUntil = (date: Date) =>
  Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000));

const isPrefetch = (request: NextRequest) =>
  request.headers.has("next-router-prefetch") ||
  request.headers.get("purpose") === "prefetch";

async function rotateSession(request: NextRequest): Promise<Rotation> {
  const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN_NAME)?.value;
  const hasSession = request.cookies.has(COOKIE_SESSION_TOKEN_NAME);

  if (
    !refreshToken ||
    hasSession ||
    isPrefetch(request) ||
    NON_ROTATING_METHODS.has(request.method)
  ) {
    return { status: "none" };
  }

  try {
    return { status: "rotated", data: await refreshSession(refreshToken, false) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { status: DEAD_REFRESH_ERRORS.has(message) ? "dead" : "none" };
  }
}

function setClearedCookies(response: NextResponse) {
  const options = getSecureCookieOptions({ maxAge: 0 });
  response.cookies.set(COOKIE_SESSION_TOKEN_NAME, "", options);
  response.cookies.set(COOKIE_REFRESH_TOKEN_NAME, "", options);
  return response;
}

function nextWithRotation(request: NextRequest, rotation: Rotation) {
  if (rotation.status === "rotated") {
    const { data } = rotation;
    request.cookies.set(COOKIE_SESSION_TOKEN_NAME, data.sessionToken);
    request.cookies.set(COOKIE_REFRESH_TOKEN_NAME, data.refreshToken);

    const response = NextResponse.next({ request });
    response.cookies.set(
      COOKIE_SESSION_TOKEN_NAME,
      data.sessionToken,
      getSecureCookieOptions({ maxAge: secondsUntil(data.sessionExpiresOn) })
    );
    response.cookies.set(
      COOKIE_REFRESH_TOKEN_NAME,
      data.refreshToken,
      getSecureCookieOptions({ maxAge: secondsUntil(data.refreshExpiresOn) })
    );
    return response;
  }

  if (rotation.status === "dead") {
    request.cookies.delete(COOKIE_SESSION_TOKEN_NAME);
    request.cookies.delete(COOKIE_REFRESH_TOKEN_NAME);
    return setClearedCookies(NextResponse.next({ request }));
  }

  return NextResponse.next();
}

function hasAuthCookie(request: NextRequest, rotation: Rotation) {
  if (rotation.status === "rotated") return true;
  if (rotation.status === "dead") return false;
  return (
    request.cookies.has(COOKIE_SESSION_TOKEN_NAME) ||
    request.cookies.has(COOKIE_REFRESH_TOKEN_NAME)
  );
}

function getBrowserLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return defaultLocale;

  const preferredLocales = acceptLanguage
    .split(",")
    .map((item) => {
      const [langCode, qPart] = item.trim().split(";");
      const q = qPart ? parseFloat(qPart.replace("q=", "")) : 1.0;
      return { lang: langCode.trim().toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of preferredLocales) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }
    const primary = lang.split("-")[0] as Locale;
    if (locales.includes(primary)) {
      return primary;
    }
  }

  return defaultLocale;
}

async function resolveRequestLocale(request: NextRequest): Promise<Locale> {
  const sessionToken = request.cookies.get(COOKIE_SESSION_TOKEN_NAME)?.value;
  const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN_NAME)?.value;

  if (sessionToken || refreshToken) {
    try {
      const resolved = sessionToken
        ? await getUserSessionByToken(sessionToken)
        : await getUserSessionByRefreshToken(refreshToken!);

      const userLang = (resolved?.user as { language?: string | null })?.language as Locale;
      if (userLang && locales.includes(userLang)) {
        return userLang;
      }
    } catch {
      // fallback to browser locale on error
    }
  }

  return getBrowserLocale(request);
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  if (matchesPrefix(pathname, API_PREFIX)) {
    return nextWithRotation(request, await rotateSession(request));
  }

  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] as Locale;

  if (!locales.includes(locale)) {
    const targetLocale = await resolveRequestLocale(request);
    url.pathname = `/${targetLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const routePath = `/${segments.slice(1).join("/")}`;
  const isProtected = PROTECTED_ROUTES.some((route) => matchesPrefix(routePath, route));

  const rotation = await rotateSession(request);

  if (isProtected && !hasAuthCookie(request, rotation)) {
    const signInUrl = new URL(`/${locale}/signin`, url);
    signInUrl.searchParams.set("return_to", pathname + url.search);
    const redirect = NextResponse.redirect(signInUrl);
    return rotation.status === "dead" ? setClearedCookies(redirect) : redirect;
  }

  return nextWithRotation(request, rotation);
}

export const config = {
  matcher: [
    "/((?!_next(?:/|$)|\\.well-known(?:/|$)|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|woff|woff2|ttf|otf|mp4|webm|pdf)$).*)",
  ],
};
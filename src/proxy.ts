import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";
import {
  COOKIE_REFRESH_TOKEN_NAME,
  COOKIE_SESSION_TOKEN_NAME,
} from "./constants/session.constants";
import { getSecureCookieOptions } from "./utils/utils";

const PROTECTED_ROUTES = ["/profile"];

// Unrecognized Privacy Sandbox features that cause browser console warnings if injected upstream
const UNRECOGNIZED_PERMISSIONS_FEATURES = new Set([
  "run-ad-auction",
  "join-ad-interest-group",
  "private-aggregation",
  "attribution-reporting",
]);

const DEFAULT_PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

// Token format: "<sessionId>.<64-char-hex>" (validated at the network boundary)
const TOKEN_FORMAT_REGEX = /^[a-zA-Z0-9_-]+\.[a-f0-9]{32,128}$/i;

export type CookieQueueItem = {
  name: string;
  value: string;
  options: Parameters<typeof NextResponse.prototype.cookies.set>[2];
};

function isValidTokenFormat(token: string | undefined): token is string {
  return Boolean(token && TOKEN_FORMAT_REGEX.test(token));
}

/**
 * Next.js 16 Network Boundary Proxy (runs in fixed Node.js runtime context).
 * Intercepts cookies at the network boundary, validates token & locale formats,
 * and forwards sanitized `x-clouauth-*` request headers downstream.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  const responseCookiesToSet: CookieQueueItem[] = [];

  // 1. Intercept & validate session cookies at the network boundary
  const rawSessionToken = request.cookies.get(COOKIE_SESSION_TOKEN_NAME)?.value;
  const rawRefreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN_NAME)?.value;

  const validSessionToken = isValidTokenFormat(rawSessionToken)
    ? rawSessionToken
    : undefined;
  const validRefreshToken = isValidTokenFormat(rawRefreshToken)
    ? rawRefreshToken
    : undefined;

  // Set lightweight client-accessible login indicator (avoids DB hits in client UI checks)
  const isAuthRoute =
    pathname === "/signin" ||
    pathname.startsWith("/signin/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/");

  if (!isAuthRoute && (validSessionToken || validRefreshToken)) {
    if (request.cookies.get("clou_logged_in")?.value !== "1") {
      responseCookiesToSet.push({
        name: "clou_logged_in",
        value: "1",
        options: { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: false },
      });
    }
  } else if ((isAuthRoute || (!validSessionToken && !validRefreshToken)) && request.cookies.has("clou_logged_in")) {
    responseCookiesToSet.push({
      name: "clou_logged_in",
      value: "",
      options: { path: "/", maxAge: 0, sameSite: "lax", httpOnly: false },
    });
  }

  // 2. Protected Route Gate (Fast network-boundary guard before RSC execution)
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute && !validSessionToken && !validRefreshToken) {
    return redirectToSignIn(url);
  }

  // 3. i18n Locale Resolution (Query param -> Cookie -> Accept-Language -> Default)
  const urlLocale =
    url.searchParams.get("locale") || url.searchParams.get("lang");
  let locale: Locale = defaultLocale;

  if (urlLocale && locales.includes(urlLocale as Locale)) {
    locale = urlLocale as Locale;
    responseCookiesToSet.push({
      name: "NEXT_LOCALE",
      value: locale,
      options: { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" },
    });
  } else {
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value as
      | Locale
      | undefined;
    if (cookieLocale && locales.includes(cookieLocale)) {
      locale = cookieLocale;
    } else {
      locale =
        resolveLocale(request.headers.get("accept-language")) || defaultLocale;
      responseCookiesToSet.push({
        name: "NEXT_LOCALE",
        value: locale,
        options: { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" },
      });
    }
  }

  // 4. Construct sanitized downstream request headers (prevent external header spoofing)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-clouauth-session");
  requestHeaders.delete("x-clouauth-refresh");

  requestHeaders.set("x-clouauth-locale", locale);
  requestHeaders.set("x-locale", locale);

  if (validSessionToken) {
    requestHeaders.set("x-clouauth-session", validSessionToken);
  }
  if (validRefreshToken) {
    requestHeaders.set("x-clouauth-refresh", validRefreshToken);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // 5. Sanitize Permissions-Policy header to strip unrecognized ad-tech features
  const existingPolicy = response.headers.get("Permissions-Policy");
  if (existingPolicy) {
    const cleanedDirectives = existingPolicy
      .split(",")
      .map((d) => d.trim())
      .filter((d) => {
        const featureName = d.split("=")[0]?.trim();
        return (
          featureName && !UNRECOGNIZED_PERMISSIONS_FEATURES.has(featureName)
        );
      });
    response.headers.set(
      "Permissions-Policy",
      cleanedDirectives.length > 0
        ? cleanedDirectives.join(", ")
        : DEFAULT_PERMISSIONS_POLICY
    );
  } else {
    response.headers.set("Permissions-Policy", DEFAULT_PERMISSIONS_POLICY);
  }

  responseCookiesToSet.forEach((cookie) => response.cookies.set(cookie));
  return response;
}

// --- Helpers ---

function resolveLocale(acceptLanguage: string | null): Locale | undefined {
  if (!acceptLanguage) return undefined;

  const preferredLocales = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";")[0].trim().split("-")[0].toLowerCase());

  return preferredLocales.find((lang) =>
    locales.includes(lang as Locale)
  ) as Locale | undefined;
}

function redirectToSignIn(url: URL) {
  const signInUrl = new URL("/signin", url);
  if (url.pathname !== "/signin" && !url.pathname.startsWith("/signin/")) {
    signInUrl.searchParams.set("return_to", url.pathname + url.search);
  }
  const response = NextResponse.redirect(signInUrl);
  // Clear stale cookies on redirect
  response.cookies.set(
    COOKIE_SESSION_TOKEN_NAME,
    "",
    getSecureCookieOptions({ maxAge: 0 })
  );
  response.cookies.set(
    COOKIE_REFRESH_TOKEN_NAME,
    "",
    getSecureCookieOptions({ maxAge: 0 })
  );
  response.cookies.set("clou_logged_in", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}

export const config = {
  matcher:
    "/((?!api|v1|_next/static|_next/image|.*\\.svg$|.*\\.png$|favicon.ico).*)",
};

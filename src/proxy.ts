import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";
import {
  COOKIE_REFRESH_TOKEN_NAME,
  COOKIE_SESSION_TOKEN_NAME,
} from "./constants/session.constants";

const PROTECTED_ROUTES = ["/profile"];

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // STRICT BYPASS: Never apply i18n logic, locale prefixing, or 307/308 redirects to machine APIs
  if (
    pathname.startsWith("/api/") ||
    pathname === "/api" ||
    pathname.startsWith("/.well-known/") ||
    pathname === "/.well-known"
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const currentLocale = segments[0] as Locale;
  const hasValidLocale = locales.includes(currentLocale);

  if (!hasValidLocale) {
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const routePath = `/${segments.slice(1).join("/")}`;
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => routePath === route || routePath.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    const hasSession = request.cookies.has(COOKIE_SESSION_TOKEN_NAME);
    const hasRefresh = request.cookies.has(COOKIE_REFRESH_TOKEN_NAME);

    if (!hasSession && !hasRefresh) {
      const signInUrl = new URL(`/${currentLocale}/signin`, url);
      signInUrl.searchParams.set("return_to", pathname + url.search);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|\\.well-known|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

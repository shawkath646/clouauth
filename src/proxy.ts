import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, type Locale } from '@/lib/i18n/config';
import { refreshSession, getUserSessionByToken } from './lib/session';
import { COOKIE_REFRESH_TOKEN_NAME, COOKIE_SESSION_TOKEN_NAME } from './constants/session.constants';
import { getSecureCookieOptions } from './utils/utils';

const PROTECTED_ROUTES = ['/profile'];

export type CookieQueueItem = {
  name: string;
  value: string;
  options: Parameters<typeof NextResponse.prototype.cookies.set>[2];
};

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  const responseCookiesToSet: CookieQueueItem[] = [];

  // 1. Auth & Protected Routes Check
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    const sessionToken = request.cookies.get(COOKIE_SESSION_TOKEN_NAME)?.value;
    let isAuthenticated = false;

    if (sessionToken) {
      const activeSession = await getUserSessionByToken(sessionToken);
      if (activeSession) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN_NAME)?.value;

      if (refreshToken) {
        try {
          const newAuthData = await refreshSession(refreshToken, false);
          const sessionMaxAge = Math.max(0, Math.floor((newAuthData.sessionExpiresOn.getTime() - Date.now()) / 1000));
          const refreshMaxAge = Math.max(0, Math.floor((newAuthData.refreshExpiresOn.getTime() - Date.now()) / 1000));

          // Crucial: Update incoming request cookies so downstream Server Components receive the new session_token
          request.cookies.set(COOKIE_SESSION_TOKEN_NAME, newAuthData.sessionToken);
          request.cookies.set(COOKIE_REFRESH_TOKEN_NAME, newAuthData.refreshToken);

          responseCookiesToSet.push({
            name: COOKIE_SESSION_TOKEN_NAME,
            value: newAuthData.sessionToken,
            options: getSecureCookieOptions({ maxAge: sessionMaxAge }),
          });

          responseCookiesToSet.push({
            name: COOKIE_REFRESH_TOKEN_NAME,
            value: newAuthData.refreshToken,
            options: getSecureCookieOptions({ maxAge: refreshMaxAge }),
          });

          isAuthenticated = true;
        } catch (error) {
          console.error('Session refresh failed in proxy:', error);
        }
      }
    }

    if (!isAuthenticated) {
      return redirectToSignIn(url);
    }
  }

  // 2. i18n Locale Resolution
  let locale = request.cookies.get('NEXT_LOCALE')?.value as Locale | undefined;

  if (!locale || !locales.includes(locale)) {
    locale = resolveLocale(request.headers.get('accept-language')) || defaultLocale;

    responseCookiesToSet.push({
      name: 'NEXT_LOCALE',
      value: locale,
      options: { path: '/', maxAge: 60 * 60 * 24 * 365 },
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('cookie', request.cookies.toString());

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  responseCookiesToSet.forEach((e) => response.cookies.set(e));
  return response;
}

// --- Helpers ---

function resolveLocale(acceptLanguage: string | null): Locale | undefined {
  if (!acceptLanguage) return undefined;

  const preferredLocales = acceptLanguage
    .split(',')
    .map((lang) => lang.split(';')[0].trim().split('-')[0].toLowerCase());

  return preferredLocales.find((lang) => locales.includes(lang as Locale)) as Locale | undefined;
}

function redirectToSignIn(url: URL) {
  const signInUrl = new URL('/signin', url);
  if (url.pathname !== '/signin' && !url.pathname.startsWith('/signin/')) {
    signInUrl.searchParams.set('return_to', url.pathname + url.search);
  }
  const response = NextResponse.redirect(signInUrl);
  // Clear stale cookies on redirect
  response.cookies.set(COOKIE_SESSION_TOKEN_NAME, '', getSecureCookieOptions({ maxAge: 0 }));
  response.cookies.set(COOKIE_REFRESH_TOKEN_NAME, '', getSecureCookieOptions({ maxAge: 0 }));
  return response;
}

export const config = {
  matcher: '/((?!api|v1|_next/static|_next/image|.*\\.svg$|.*\\.png$|favicon.ico).*)',
};
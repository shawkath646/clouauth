import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, type Locale } from '@/lib/i18n/config';

const PROTECTED_ROUTES = ['/profile'];

type CookieQueueItem = {
  name: string;
  value: string;
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none" | boolean;
    path?: string;
    maxAge?: number;
    domain?: string;
    expires?: Date | number;
  };
};

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    url.pathname === route || url.pathname.startsWith(`${route}/`)
  );

  const requestHeaders = new Headers(request.headers);
  const responseCookiesToSet: CookieQueueItem[] = [];

  // ==========================================
  // AUTHENTICATION BLOCK
  // ==========================================
  if (isProtectedRoute) {
    const sessionToken = request.cookies.get("session_token")?.value;
    
    if (!sessionToken) {
      const refreshToken = request.cookies.get("refresh_token")?.value;
      
      if (refreshToken) {
        try {
          // Note: If /api/auth is in this same Next.js app, replace this fetch 
          // with a direct function call if possible to avoid the HTTP overhead!
          const refreshUrl = new URL('/api/auth/v1/refresh', request.nextUrl.origin);
          const refreshRes = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();

            // Reconstruct the cookie header for downstream Server Components
            const currentCookies = request.cookies.getAll()
              .filter(c => c.name !== 'session_token' && c.name !== 'refresh_token')
              .map(c => `${c.name}=${c.value}`);

            currentCookies.push(`session_token=${data.sessionToken}`);
            currentCookies.push(`refresh_token=${data.refreshToken}`);
            requestHeaders.set('cookie', currentCookies.join('; '));

            // Queue cookies to be set on the outgoing browser response
            const sessionMaxAge = Math.floor((new Date(data.sessionExpiresOn).getTime() - Date.now()) / 1000);
            const refreshMaxAge = Math.floor((new Date(data.refreshExpiresOn).getTime() - Date.now()) / 1000);

            responseCookiesToSet.push(
              {
                name: 'session_token',
                value: data.sessionToken,
                options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.max(sessionMaxAge, 15 * 60) }
              },
              {
                name: 'refresh_token',
                value: data.refreshToken,
                options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.max(refreshMaxAge, 24 * 60 * 60) }
              }
            );
          } else {
            // Failed refresh
            return redirectToSignIn(url, request.nextUrl.pathname);
          }
        } catch {
          // Network or parsing error
          return redirectToSignIn(url, request.nextUrl.pathname);
        }
      } else {
        // No tokens at all
        return redirectToSignIn(url, request.nextUrl.pathname);
      }
    }
  }

  // ==========================================
  // I18N BLOCK
  // ==========================================
  let locale = request.cookies.get('NEXT_LOCALE')?.value;

  if (!locale || !locales.includes(locale as Locale)) {
    const acceptLanguage = request.headers.get('accept-language');
    locale = defaultLocale; // fallback

    if (acceptLanguage) {
      // Slightly more robust manual parsing (checks preferences in order)
      const preferredLocales = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().split('-')[0].toLowerCase());
        
      const matchedLocale = preferredLocales.find(lang => locales.includes(lang as Locale));
      if (matchedLocale) locale = matchedLocale;
    }

    // Queue locale cookie
    responseCookiesToSet.push({
      name: 'NEXT_LOCALE',
      value: locale,
      options: { path: '/', maxAge: 60 * 60 * 24 * 365 }
    });
  }

  // ==========================================
  // FINALIZE RESPONSE
  // ==========================================
  // 3. Create the response exactly once
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Apply all queued cookies
  responseCookiesToSet.forEach(cookie => {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  });

  return response;
}

function redirectToSignIn(url: URL, returnToPath: string) {
  url.pathname = '/signin';
  url.searchParams.set('return_to', returnToPath);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/((?!api|v1|_next/static|_next/image|.*\\.svg$|.*\\.png$|favicon.ico).*)',
};
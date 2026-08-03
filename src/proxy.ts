import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, type Locale } from '@/lib/i18n/config';

// Define which routes require authentication
const PROTECTED_ROUTES = ['/dashboard', '/account', '/settings'];

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Lightweight authentication check
  const isProtectedRoute = PROTECTED_ROUTES.some(route => url.pathname.startsWith(route));
  
  if (isProtectedRoute) {
    const sessionToken = request.cookies.get("session_token");
    if (!sessionToken || !sessionToken.value) {
      // Missing ST cookie, redirect to login
      url.pathname = '/login';
      url.searchParams.set('return_to', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();

  let locale = request.cookies.get('NEXT_LOCALE')?.value;

  if (!locale || !locales.includes(locale as Locale)) {
    // Detect from Accept-Language header
    const acceptLanguage = request.headers.get('accept-language');
    if (acceptLanguage) {
      const preferred = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
      if (locales.includes(preferred as Locale)) {
        locale = preferred;
      } else {
        locale = defaultLocale;
      }
    } else {
      locale = defaultLocale;
    }
    
    // Save user preference
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return response;
}

export const config = {
  // Exclude static files, API routes, images, etc.
  matcher: '/((?!api|v1|_next/static|_next/image|.*\\.svg$|.*\\.png$|favicon.ico).*)',
};

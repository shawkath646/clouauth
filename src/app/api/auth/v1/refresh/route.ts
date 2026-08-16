import { NextRequest, NextResponse } from "next/server";
import { refreshSession } from "@/lib/session";
import { COOKIE_SESSION_TOKEN_NAME, COOKIE_REFRESH_TOKEN_NAME, SESSION_TOKEN_TTL, REFRESH_TOKEN_TTL, REFRESH_TOKEN_TTL_REMEMBER_ME } from "@/constants/session.constants";
import { handleError } from "@/utils/error";

// POST /v1/auth/refresh
// Pure API endpoint - takes RT in JSON body, returns new ST/RT pair as JSON
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const refreshToken = body.refreshToken;

        if (!refreshToken) {
            return NextResponse.json({ error: "missing_refresh_token" }, { status: 400 });
        }

        const newTokens = await refreshSession(refreshToken);
        
        return NextResponse.json({
            sessionToken: newTokens.sessionToken,
            refreshToken: newTokens.refreshToken,
            sessionExpiresOn: newTokens.sessionExpiresOn.toISOString(),
            refreshExpiresOn: newTokens.refreshExpiresOn.toISOString()
        });

    } catch (e: unknown) {
    const em = handleError(e, "Failed to execute POST");
        if (e instanceof Error && e.message === "replay_attack_detected") {
            return NextResponse.json({ error: em }, { status: 401 });
        }
        return NextResponse.json({ error: em }, { status: 401 });
    }
}

// GET /v1/auth/refresh?redirect=/dashboard
// Browser endpoint - reads RT from cookie, sets new cookies, redirects
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const redirectUrl = searchParams.get("redirect") || "/";

    const refreshTokenCookie = request.cookies.get(COOKIE_REFRESH_TOKEN_NAME);
    
    if (!refreshTokenCookie || !refreshTokenCookie.value) {
        // No refresh token, force login
        return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
        const newTokens = await refreshSession(refreshTokenCookie.value);
        
        const response = NextResponse.redirect(new URL(redirectUrl, request.url));
        
        // Set new cookies
        response.cookies.set({
            name: COOKIE_SESSION_TOKEN_NAME,
            value: newTokens.sessionToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            // ST is always short-lived
            maxAge: SESSION_TOKEN_TTL
        });

        // Set RT cookie
        const rtMaxAge = Math.floor((newTokens.refreshExpiresOn.getTime() - Date.now()) / 1000);
        
        response.cookies.set({
            name: COOKIE_REFRESH_TOKEN_NAME,
            value: newTokens.refreshToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: rtMaxAge
        });

        return response;
    } catch (e: unknown) {
    const em = handleError(e, "Failed to execute GET");
        // Clear cookies on failure (especially replay attack)
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete(COOKIE_SESSION_TOKEN_NAME);
        response.cookies.delete(COOKIE_REFRESH_TOKEN_NAME);
        return response;
    }
}

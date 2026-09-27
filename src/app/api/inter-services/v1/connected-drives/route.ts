import { NextRequest, NextResponse } from "next/server";
import { verifyInterServiceAuth } from "@/lib/inter-services/auth";
import {
  handleInterServicePreflight,
  withInterServiceCors,
} from "@/lib/inter-services/cors";
import { COOKIE_SESSION_TOKEN_NAME } from "@/constants/session.constants";
import { getUserSessionByToken } from "@/lib/session";
import { decryptSymmetric } from "@/lib/encryption";
import { refreshDriveAccountToken } from "@/lib/inter-services/drives";
import prisma from "@/lib/prisma";
import { handleError } from "@/utils/error";

export function OPTIONS(request: NextRequest) {
  return handleInterServicePreflight(request);
}

export async function GET(request: NextRequest) {
  return handleConnectedDrives(request);
}

export async function POST(request: NextRequest) {
  return handleConnectedDrives(request);
}

async function handleConnectedDrives(request: NextRequest) {
  try {
    // 1. Verify calling application's Bearer JWT token
    const authResult = await verifyInterServiceAuth(request);
    if (!authResult.authorized) {
      return withInterServiceCors(
        NextResponse.json(
          {
            success: false,
            error: authResult.error || "Unauthorized application.",
          },
          { status: authResult.status || 401 }
        ),
        request
      );
    }

    // 2. Extract user session token from cookies
    const sessionCookie =
      request.cookies.get(COOKIE_SESSION_TOKEN_NAME)?.value ||
      extractCookieFromHeader(request.headers.get("cookie"), COOKIE_SESSION_TOKEN_NAME);

    let userId: string | null = null;

    if (sessionCookie) {
      const activeSession = await getUserSessionByToken(sessionCookie);
      if (activeSession) {
        userId = activeSession.user.id;
      }
    }

    // Fallback: If no cookie is present, allow authorized internal services to pass ?user_id or x-user-id
    if (!userId) {
      const userIdParam =
        request.nextUrl.searchParams.get("user_id") ||
        request.headers.get("x-user-id");

      if (userIdParam && (authResult.payload?.type === "internal_service" || authResult.payload?.role === "internal" || authResult.clientId)) {
        userId = userIdParam;
      }
    }

    if (!userId) {
      return withInterServiceCors(
        NextResponse.json(
          {
            success: false,
            error: "No active user session found. Ensure credentials: 'include' or provide user_id.",
          },
          { status: 401 }
        ),
        request
      );
    }

    // 3. Query connected accounts for this user
    const requestedProvider = request.nextUrl.searchParams.get("provider")?.toLowerCase();
    const shouldForceRefresh = request.nextUrl.searchParams.get("refresh") === "true";

    const allAccounts = await prisma.oAuthAccount.findMany({
      where: { user_id: userId },
    });

    const driveProviders = new Set(["google_drive", "onedrive", "dropbox", "google", "microsoft"]);

    // Filter by specific provider if requested, otherwise match known drive providers
    const targetAccounts = allAccounts.filter((acc) => {
      const p = acc.provider.toLowerCase();
      if (requestedProvider) {
        return p === requestedProvider;
      }
      return driveProviders.has(p);
    });

    const nowSeconds = Math.floor(Date.now() / 1000);

    // 4. Decrypt tokens and optionally refresh expired credentials
    const driveCredentials = await Promise.all(
      targetAccounts.map(async (acc) => {
        let rawAccessToken: string | null = null;
        let rawRefreshToken: string | null = null;

        try {
          if (acc.access_token) {
            rawAccessToken = decryptSymmetric(acc.access_token);
          }
        } catch {
          rawAccessToken = acc.access_token;
        }

        try {
          if (acc.refresh_token) {
            rawRefreshToken = decryptSymmetric(acc.refresh_token);
          }
        } catch {
          rawRefreshToken = acc.refresh_token;
        }

        let expiresAt = acc.expires_at || null;
        let isExpired = expiresAt ? nowSeconds >= expiresAt : false;

        // Proactive token refresh if token is expired or if force-refresh is requested
        if ((isExpired || shouldForceRefresh) && rawRefreshToken) {
          const refreshed = await refreshDriveAccountToken(
            acc.id,
            acc.provider,
            rawRefreshToken
          );

          if (refreshed) {
            rawAccessToken = refreshed.accessToken;
            if (refreshed.refreshToken) rawRefreshToken = refreshed.refreshToken;
            if (refreshed.expiresAt) {
              expiresAt = refreshed.expiresAt;
              isExpired = false;
            }
          }
        }

        const expiresIn = expiresAt ? Math.max(0, expiresAt - nowSeconds) : null;

        return {
          id: acc.id,
          provider: acc.provider,
          provider_user_id: acc.provider_user_id,
          access_token: rawAccessToken,
          refresh_token: rawRefreshToken,
          expires_at: expiresAt,
          expires_in: expiresIn,
          is_expired: isExpired,
          created_on: acc.created_on.toISOString(),
        };
      })
    );

    return withInterServiceCors(
      NextResponse.json({
        success: true,
        user_id: userId,
        count: driveCredentials.length,
        drives: driveCredentials,
      }),
      request
    );
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute handleConnectedDrives");
    return withInterServiceCors(
      NextResponse.json({ success: false, error: em }, { status: 500 }),
      request
    );
  }
}

function extractCookieFromHeader(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieName}=`));
  return match ? match.slice(cookieName.length + 1) : null;
}

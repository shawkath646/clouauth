import { NextRequest, NextResponse } from "next/server";
import { verifyInterServiceAuth } from "@/lib/inter-services/auth";
import {
  handleInterServicePreflight,
  withInterServiceCors,
} from "@/lib/inter-services/cors";
import { COOKIE_SESSION_TOKEN_NAME } from "@/constants/session.constants";
import { getUserSessionByToken } from "@/lib/session";
import prisma from "@/lib/prisma";
import { handleError } from "@/utils/error";

export function OPTIONS(request: NextRequest) {
  return handleInterServicePreflight(request);
}

export async function GET(request: NextRequest) {
  return handleUserSession(request);
}

export async function POST(request: NextRequest) {
  return handleUserSession(request);
}

async function handleUserSession(request: NextRequest) {
  try {
    // 1. Verify calling application's Bearer JWT token
    const authResult = await verifyInterServiceAuth(request);
    if (!authResult.authorized) {
      return withInterServiceCors(
        NextResponse.json(
          {
            authenticated: false,
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

      if (userIdParam && authResult.payload?.type === "internal_service") {
        userId = userIdParam;
      }
    }

    if (!userId) {
      return withInterServiceCors(
        NextResponse.json(
          {
            authenticated: false,
            message: "No active user session found.",
            user: null,
          },
          { status: 200 }
        ),
        request
      );
    }

    // 3. Parse requested scopes (default: ?scope=id,firstname,lastname,email)
    const rawScope = request.nextUrl.searchParams.get("scope");
    const requestedScopeTokens = rawScope
      ? rawScope
          .toLowerCase()
          .split(/[\s,]+/)
          .filter(Boolean)
      : ["id", "firstname", "lastname", "email"];

    const scopeSet = new Set(requestedScopeTokens);

    // Expand OIDC standard aliases if requested
    if (scopeSet.has("profile")) {
      scopeSet.add("firstname");
      scopeSet.add("lastname");
      scopeSet.add("username");
      scopeSet.add("avatar");
    }

    // 4. Query user data from Prisma based on requested scopes
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        emails: { where: { is_primary: true } },
        preferences: scopeSet.has("preferences"),
        addresses: scopeSet.has("addresses"),
        phones: scopeSet.has("phone") || scopeSet.has("phones"),
      },
    });

    if (!user) {
      return withInterServiceCors(
        NextResponse.json(
          {
            authenticated: false,
            message: "User not found or session invalid.",
            user: null,
          },
          { status: 200 }
        ),
        request
      );
    }

    // 5. Build filtered user object according to requested scope
    const primaryEmail = user.emails?.[0];
    const userData: Record<string, unknown> = {
      id: user.id, // ID is always included
    };

    if (scopeSet.has("username")) {
      userData.username = user.username;
    }
    if (scopeSet.has("firstname") || scopeSet.has("first_name") || scopeSet.has("given_name")) {
      userData.first_name = user.first_name;
    }
    if (scopeSet.has("lastname") || scopeSet.has("last_name") || scopeSet.has("family_name")) {
      userData.last_name = user.last_name;
    }
    if (scopeSet.has("email") || scopeSet.has("primary_email")) {
      userData.email = primaryEmail?.address || null;
      userData.email_verified = Boolean(primaryEmail?.verified);
    }
    if (scopeSet.has("avatar") || scopeSet.has("picture") || scopeSet.has("image")) {
      userData.avatar = user.avatar;
    }
    if (scopeSet.has("bio")) {
      userData.bio = user.bio;
    }
    if (scopeSet.has("pronouns")) {
      userData.pronouns = user.pronouns;
    }
    if (scopeSet.has("date_of_birth") || scopeSet.has("dob")) {
      userData.date_of_birth = user.date_of_birth;
    }
    if (scopeSet.has("created_on") || scopeSet.has("created_at")) {
      userData.created_on = user.created_on;
    }
    if (scopeSet.has("updated_on") || scopeSet.has("updated_at")) {
      userData.updated_on = user.updated_on;
    }
    if (scopeSet.has("preferences") && user.preferences) {
      userData.preferences = {
        theme: user.preferences.theme,
        language: user.preferences.language,
        timezone: user.preferences.timezone,
      };
    }
    if (scopeSet.has("addresses") && user.addresses) {
      userData.addresses = user.addresses;
    }
    if ((scopeSet.has("phone") || scopeSet.has("phones")) && user.phones) {
      userData.phones = user.phones.map((p) => ({
        number: p.number,
        country_code: p.country_code,
        verified: p.verified,
        is_primary: p.is_primary,
      }));
    }

    return withInterServiceCors(
      NextResponse.json({
        authenticated: true,
        user: userData,
        scopes: Array.from(scopeSet),
      }),
      request
    );
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute handleUserSession");
    return withInterServiceCors(
      NextResponse.json({ error: "server_error", message: em }, { status: 500 }),
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

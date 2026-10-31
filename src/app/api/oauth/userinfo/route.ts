import { NextRequest, NextResponse } from "next/server";
import { getOAuthSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { handleSsoPreflight, withSsoCors } from "@/lib/sso/cors";

export function OPTIONS() {
  return handleSsoPreflight();
}

export async function GET(request: NextRequest) {
  return handleUserInfo(request);
}

export async function POST(request: NextRequest) {
  return handleUserInfo(request);
}

async function handleUserInfo(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_token", error_description: "Missing or invalid authorization header." },
          { status: 401, headers: { "WWW-Authenticate": "Bearer error=\"invalid_token\"" } }
        )
      );
    }

    const accessToken = authHeader.slice(7).trim();
    const sessionData = await getOAuthSession(accessToken);

    if (!sessionData || !sessionData.user) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_token", error_description: "The access token is expired or revoked." },
          { status: 401, headers: { "WWW-Authenticate": "Bearer error=\"invalid_token\"" } }
        )
      );
    }

    const { user, scopes } = sessionData;

    // Base claim required by OIDC
    const claims: Record<string, unknown> = {
      sub: user.id,
    };

    // Strict scope checking before serving requested profile attributes
    const allowsProfile = scopes.includes("openid") || scopes.includes("profile");
    if (allowsProfile) {
      claims.name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
      claims.given_name = user.first_name || undefined;
      claims.family_name = user.last_name || undefined;
      claims.preferred_username = user.username || undefined;
      claims.picture = user.avatar || undefined;
      claims.updated_at = user.updated_on ? Math.floor(new Date(user.updated_on).getTime() / 1000) : undefined;
    }

    const allowsEmail = scopes.includes("openid") || scopes.includes("email");
    if (allowsEmail) {
      const primaryEmail = user.emails?.[0];
      claims.email = primaryEmail?.address || undefined;
      claims.email_verified = primaryEmail?.verified ?? false;
    }

    const allowsPhone = scopes.includes("phone");
    if (allowsPhone) {
      const primaryPhone = user.phones?.[0];
      if (primaryPhone) {
        claims.phone_number = `${primaryPhone.country_code}${primaryPhone.number}`;
        claims.phone_number_verified = primaryPhone.verified;
      }
    }

    return withSsoCors(NextResponse.json(claims));
  } catch (e: unknown) {
    const em = handleError(e, "Failed to resolve UserInfo");
    return withSsoCors(
      NextResponse.json({ error: "server_error", error_description: em }, { status: 500 })
    );
  }
}

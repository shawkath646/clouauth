import { NextRequest, NextResponse } from "next/server";
import { getOAuthSession } from "@/lib/session";
import { handleError } from "@/utils/error";

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
            return NextResponse.json(
                { error: "invalid_token", error_description: "Missing or invalid authorization header." },
                { status: 401, headers: { "WWW-Authenticate": "Bearer error=\"invalid_token\"" } }
            );
        }

        const accessToken = authHeader.slice(7).trim();
        const sessionData = await getOAuthSession(accessToken);

        if (!sessionData || !sessionData.user) {
            return NextResponse.json(
                { error: "invalid_token", error_description: "The access token is expired or revoked." },
                { status: 401, headers: { "WWW-Authenticate": "Bearer error=\"invalid_token\"" } }
            );
        }

        const { user, scopes } = sessionData;

        // Base claim required by OIDC
        const claims: Record<string, unknown> = {
            sub: user.id
        };

        // Strict scope checking before serving requested profile attributes
        const allowsProfile = scopes.includes("openid") || scopes.includes("profile");
        if (allowsProfile) {
            claims.name = `${user.first_name} ${user.last_name}`.trim();
            claims.given_name = user.first_name;
            claims.family_name = user.last_name;
            claims.preferred_username = user.username;
            claims.picture = user.avatar;
            claims.profile = "/profile";
            claims.updated_at = Math.floor(new Date(user.updated_on).getTime() / 1000);
        }

        if (scopes.includes("email")) {
            claims.email = (sessionData.user as any).email || (sessionData.user as any).emails?.[0]?.address || null;
            claims.email_verified = true;
        }

        return NextResponse.json(claims);
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute handleUserInfo");
        return NextResponse.json({ error: "server_error", error_description: em }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/misc/utils";

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || "default_development_secret_only");

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        
        const client_id = searchParams.get("client_id");
        const redirect_uri = searchParams.get("redirect_uri");
        const response_type = searchParams.get("response_type");
        const state = searchParams.get("state");
        const code_challenge = searchParams.get("code_challenge");
        const code_challenge_method = searchParams.get("code_challenge_method");
        const scope = searchParams.get("scope");

        if (!client_id || !redirect_uri || !response_type) {
            return NextResponse.json({ error: "missing_required_parameters" }, { status: 400 });
        }

        if (response_type !== "code") {
            return NextResponse.json({ error: "unsupported_response_type" }, { status: 400 });
        }

        // Validate client_id against database
        const clientApp = await prisma.oAuthClientConfig.findUnique({
            where: { client_id }
        });

        if (!clientApp) {
            return NextResponse.json({ error: "invalid_client" }, { status: 401 });
        }

        // Validate redirect_uri (in production, ensure it matches registered URIs)
        const allowedUris = JSON.parse(clientApp.redirect_uris || "[]");
        if (!allowedUris.includes(redirect_uri) && process.env.NODE_ENV === "production") {
            return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
        }

        // Create the stateless OAuth request session JWT
        const authRequestToken = await new SignJWT({
            client_id,
            redirect_uri,
            state,
            code_challenge,
            code_challenge_method,
            scope,
            type: "oauth_auth_request"
        })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("15m") // Request is valid for 15 minutes to complete login
        .sign(getSecret());

        // Redirect to Sign In page
        const response = NextResponse.redirect(new URL("/signin", request.url));
        
        response.cookies.set("oauth_auth_req", authRequestToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 15 * 60 // 15 mins
        });

        return response;

    } catch (e: unknown) {
    const em = getErrorMessage(e);
        console.error("Authorize Endpoint Error:", e);
        return NextResponse.json({ error: em }, { status: 500 });
    }
}

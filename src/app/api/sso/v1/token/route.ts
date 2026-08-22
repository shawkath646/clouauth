import { getEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT, importJWK } from "jose";
import prisma from "@/lib/prisma";
import { createOAuthSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { getSecret } from "@/lib/jwt-secret";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: NextRequest) {
    try {
        let clientId: string | null = null;
        let _clientSecret: string | null = null;
        let code: string | null = null;
        let grantType: string | null = null;
        let redirectUri: string | null = null;

        const authHeader = request.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Basic ")) {
            const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
            const parts = decoded.split(":");
            if (parts.length === 2) {
                clientId = parts[0];
                _clientSecret = parts[1];
            }
        }

        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            clientId = clientId || (formData.get("client_id") as string);
            _clientSecret = _clientSecret || (formData.get("client_secret") as string);
            code = formData.get("code") as string;
            grantType = formData.get("grant_type") as string;
            redirectUri = formData.get("redirect_uri") as string;
        } else {
            const json = await request.json().catch(() => ({}));
            clientId = clientId || json.client_id;
            _clientSecret = _clientSecret || json.client_secret;
            code = json.code;
            grantType = json.grant_type;
            redirectUri = json.redirect_uri;
        }

        if (grantType !== "authorization_code") {
            return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
        }

        if (!code || !clientId) {
            return NextResponse.json({ error: "invalid_request", error_description: "Missing required parameters." }, { status: 400 });
        }

        // Verify authorization code JWT
        let payload;
        try {
            const verified = await jwtVerify(code, getSecret());
            payload = verified.payload;
        } catch {
            return NextResponse.json({ error: "invalid_grant", error_description: "Invalid or expired authorization code." }, { status: 400 });
        }

        if (payload.type !== "authorization_code" || payload.client_id !== clientId) {
            return NextResponse.json({ error: "invalid_grant", error_description: "Authorization code mismatch." }, { status: 400 });
        }

        if (redirectUri && payload.redirect_uri !== redirectUri) {
            return NextResponse.json({ error: "invalid_grant", error_description: "Redirect URI mismatch." }, { status: 400 });
        }

        let codeVerifier: string | null = null;
        if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
            const formData = await request.formData().catch(() => null);
            codeVerifier = formData?.get("code_verifier") as string | undefined || null;
        } else {
            const json = await request.json().catch(() => ({}));
            codeVerifier = json?.code_verifier || null;
        }

        const codeChallenge = payload.code_challenge as string | undefined;
        const codeChallengeMethod = payload.code_challenge_method as string | undefined;

        if (codeChallenge) {
            if (!codeVerifier) {
                return NextResponse.json(
                    { error: "invalid_request", error_description: "code_verifier is required for PKCE." },
                    { status: 400 }
                );
            }

            if (codeChallengeMethod === "S256") {
                const digest = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
                if (digest !== codeChallenge) {
                    return NextResponse.json(
                        { error: "invalid_grant", error_description: "PKCE code_verifier does not match." },
                        { status: 400 }
                    );
                }
            } else {
                if (codeVerifier !== codeChallenge) {
                    return NextResponse.json(
                        { error: "invalid_grant", error_description: "PKCE code_verifier does not match." },
                        { status: 400 }
                    );
                }
            }
        }

        const clientApp = await prisma.oAuthClientConfig.findUnique({
            where: { client_id: clientId }
        });

        if (!clientApp || !clientApp.enabled) {
            return NextResponse.json({ error: "invalid_client" }, { status: 401 });
        }

        const authMethod = clientApp.token_endpoint_auth_method;
        if (authMethod === "client_secret_post" || authMethod === "client_secret_basic") {
            if (!_clientSecret) {
                return NextResponse.json(
                    { error: "invalid_client", error_description: "Client secret is required." },
                    { status: 401 }
                );
            }
            if (!clientApp.client_secret_hash) {
                return NextResponse.json(
                    { error: "invalid_client", error_description: "Client secret hash not found." },
                    { status: 401 }
                );
            }
            const isSecretValid = await bcrypt.compare(_clientSecret, clientApp.client_secret_hash);
            if (!isSecretValid) {
                return NextResponse.json(
                    { error: "invalid_client", error_description: "Invalid client credentials." },
                    { status: 401 }
                );
            }
        }

        const userId = String(payload.user_id);
        const scope = String(payload.scope || "openid profile email");

        // Create OAuth Session
        const tokenData = await createOAuthSession(userId, clientId, scope);

        // Generate ID Token (OIDC standard)
        const signingKey = await prisma.signingKey.findFirst({
            where: { active: true, revokedAt: null },
        });

        if (!signingKey) {
            return NextResponse.json(
                { error: "server_error", error_description: "No active signing key found." },
                { status: 500 }
            );
        }

        const privateJwk = JSON.parse(signingKey.privateKey);
        const privateKey = await importJWK(privateJwk, "RS256");

        const idToken = await new SignJWT({
            sub: userId,
            aud: clientId,
            iss: getEnv("NEXT_PUBLIC_APP_URL"),
            auth_time: Math.floor(Date.now() / 1000),
            scope,
            nonce: payload.nonce as string | undefined,
        })
        .setProtectedHeader({ alg: "RS256", kid: signingKey.kid, typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);

        return NextResponse.json({
            access_token: tokenData.accessToken,
            token_type: "Bearer",
            expires_in: tokenData.expiresIn,
            refresh_token: tokenData.refreshToken,
            id_token: idToken,
            scope: tokenData.scope
        });
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute POST");
        return NextResponse.json({ error: "server_error", error_description: em }, { status: 500 });
    }
}

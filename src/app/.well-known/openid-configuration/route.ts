import { NextResponse } from "next/server";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export function GET() {

    const oidc_config = {
        issuer: baseURL,
        authorization_endpoint: new URL("/api/sso/v1/authorize", baseURL),
        token_endpoint: new URL("/api/sso/v1/token", baseURL),
        userinfo_endpoint: new URL("/api/sso/v1/userinfo", baseURL),
        revocation_endpoint: new URL("/api/sso/v1/revoke", baseURL),
        end_session_endpoint: new URL("/api/sso/v1/logout", baseURL),
        jwks_uri: new URL("/api/sso/v1/jwks.json", baseURL),
        response_types_supported: [
            "code"
        ],
        response_modes_supported: [
            "query",
            "form_post"
        ],
        subject_types_supported: [
            "public",
            "pairwise"
        ],
        id_token_signing_alg_values_supported: [
            "RS256",
            "ES256",
            "EdDSA"
        ],
        scopes_supported: [
            "openid",
            "profile",
            "email",
            "offline_access"
        ],
        token_endpoint_auth_methods_supported: [
            "client_secret_post",
            "client_secret_basic",
            "none"
        ],
        claims_supported: [
            "sub",
            "iss",
            "aud",
            "exp",
            "iat",

            "name",
            "given_name",
            "family_name",
            "preferred_username",

            "email",
            "email_verified",

            "picture",

            "nonce",
            "auth_time"
        ],
        code_challenge_methods_supported: [
            "S256"
        ],
        grant_types_supported: [
            "authorization_code",
            "refresh_token",
            "client_credentials"
        ],
        authorization_response_iss_parameter_supported: true
    };

    return NextResponse.json(oidc_config, {
        headers: {
            "Cache-Control": "public, max-age=3600"
        },
        status: 200
    });
}
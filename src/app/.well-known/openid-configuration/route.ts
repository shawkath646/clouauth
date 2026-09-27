import { getEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";
import { handleSsoPreflight, withSsoCors } from "@/lib/sso/cors";

export function OPTIONS() {
  return handleSsoPreflight();
}

export function GET(request: NextRequest) {
  const baseURL =
    getEnv("NEXT_PUBLIC_BASE_URL", true) ||
    getEnv("NEXT_PUBLIC_APP_URL", true) ||
    request.nextUrl.origin;

  const oidc_config = {
    issuer: baseURL,
    authorization_endpoint: new URL("/signin", baseURL).toString(),
    token_endpoint: new URL("/api/sso/v1/token", baseURL).toString(),
    userinfo_endpoint: new URL("/api/sso/v1/userinfo", baseURL).toString(),
    revocation_endpoint: new URL("/api/sso/v1/revoke", baseURL).toString(),
    jwks_uri: new URL("/api/sso/v1/jwks.json", baseURL).toString(),
    response_types_supported: ["code"],
    response_modes_supported: ["query", "form_post"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email", "phone", "offline_access"],
    token_endpoint_auth_methods_supported: [
      "client_secret_post",
      "client_secret_basic",
      "none",
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
      "auth_time",
    ],
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "client_credentials",
    ],
    authorization_response_iss_parameter_supported: true,
  };

  const response = NextResponse.json(oidc_config, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
    status: 200,
  });

  return withSsoCors(response);
}

import { NextResponse } from "next/server";
import { handleSsoPreflight, withSsoCors } from "@/lib/sso/cors";
import { getEnv } from "@/utils/utils";

export function OPTIONS() {
  return handleSsoPreflight();
}

export function GET() {
  const baseURL = ( getEnv("NEXT_PUBLIC_BASE_URL", true)).replace(/\/$/, "");

  const oidc_config = {
    issuer: baseURL,
    authorization_endpoint: `${baseURL}/api/authorize`,
    token_endpoint: `${baseURL}/api/oauth/token`,
    userinfo_endpoint: `${baseURL}/api/oauth/userinfo`,
    revocation_endpoint: `${baseURL}/api/oauth/revoke`,
    introspection_endpoint: `${baseURL}/api/oauth/introspect`,
    jwks_uri: `${baseURL}/api/oauth/jwks`,
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

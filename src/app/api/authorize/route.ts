import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { parseRedirectUris } from "@/lib/oauth/scope-utils";
import { signAuthRequest } from "@/lib/oauth/auth-request";
import { AUTH_REQUEST_PARAM } from "@/constants/oauth.constants";
import { resolveLocale } from "@/lib/i18n/server";
import { handleSsoPreflight } from "@/lib/sso/cors";
import { grantOAuthAccess } from "@/actions/oauth/oauth.actions";

export function OPTIONS() {
  return handleSsoPreflight();
}

const getStringParam = (param: string | null) => (param ? param.trim() : null);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const clientId = getStringParam(searchParams.get("client_id"));
  const redirectUri = getStringParam(searchParams.get("redirect_uri"));
  const responseType = getStringParam(searchParams.get("response_type"));
  const scope = getStringParam(searchParams.get("scope")) || "openid profile email";
  const state = getStringParam(searchParams.get("state"));
  const codeChallenge = getStringParam(searchParams.get("code_challenge"));
  const codeChallengeMethod = getStringParam(searchParams.get("code_challenge_method"));
  const nonce = getStringParam(searchParams.get("nonce"));
  const lang = getStringParam(searchParams.get("lang"));

  const locale = resolveLocale(lang || undefined);
  const baseUrl = request.nextUrl.origin;

  // 1. Mandatory client_id and redirect_uri validation
  if (!clientId || !redirectUri) {
    const errorUrl = new URL(`/${locale}/signin`, baseUrl);
    errorUrl.searchParams.set("error", "missing_parameters");
    return NextResponse.redirect(errorUrl);
  }

  // 2. Fetch and validate client from database
  const clientApp = await prisma.oAuthClientConfig.findUnique({
    where: { client_id: clientId },
    include: { app: true },
  });

  if (!clientApp || !clientApp.enabled) {
    const errorUrl = new URL(`/${locale}/signin`, baseUrl);
    errorUrl.searchParams.set("error", "connection_failed");
    return NextResponse.redirect(errorUrl);
  }

  // 3. Strict redirect_uri matching against registered URIs
  const registeredUris = parseRedirectUris(clientApp.redirect_uris);
  if (!registeredUris.includes(redirectUri)) {
    const errorUrl = new URL(`/${locale}/signin`, baseUrl);
    errorUrl.searchParams.set("error", "connection_failed");
    return NextResponse.redirect(errorUrl);
  }

  // 4. Validate response_type (RFC 6749 only supports "code" for authorization code grant)
  if (responseType !== "code") {
    const errorRedirect = new URL(redirectUri);
    errorRedirect.searchParams.set("error", "unsupported_response_type");
    errorRedirect.searchParams.set(
      "error_description",
      `The response_type '${responseType || "unknown"}' is not supported. Only 'code' is supported.`
    );
    if (state) errorRedirect.searchParams.set("state", state);
    return NextResponse.redirect(errorRedirect);
  }

  // 5. Enforce PKCE requirement (RFC 7636 / OAuth 2.0 Security BCP)
  const isPublicClient =
    clientApp.client_type === "public" || clientApp.token_endpoint_auth_method === "none";

  if ((clientApp.pkce_required || isPublicClient) && !codeChallenge) {
    const errorRedirect = new URL(redirectUri);
    errorRedirect.searchParams.set("error", "invalid_request");
    errorRedirect.searchParams.set(
      "error_description",
      "PKCE code_challenge (S256) is required for this client."
    );
    if (state) errorRedirect.searchParams.set("state", state);
    return NextResponse.redirect(errorRedirect);
  }

  if (codeChallenge && codeChallengeMethod && codeChallengeMethod !== "S256") {
    const errorRedirect = new URL(redirectUri);
    errorRedirect.searchParams.set("error", "invalid_request");
    errorRedirect.searchParams.set(
      "error_description",
      "Only 'S256' code_challenge_method is supported."
    );
    if (state) errorRedirect.searchParams.set("state", state);
    return NextResponse.redirect(errorRedirect);
  }

  // 6. Pack validated OAuth authorization parameters into signed JWT
  const authRequestToken = await signAuthRequest({
    clientId,
    redirectUri,
    responseType,
    scope,
    state,
    codeChallenge,
    codeChallengeMethod: codeChallenge ? codeChallengeMethod || "S256" : null,
    nonce,
    appName: clientApp.app.name,
    appIcon: clientApp.app.icon,
    appDescription: clientApp.app.description,
    appWebsite: clientApp.app.website,
  });

  // 7. Route based on active session existence and prior consent
  const session = await getUserSession();
  const prompt = getStringParam(searchParams.get("prompt"));

  if (session && prompt !== "consent") {
    const existingConsent = await prisma.oAuthConsent.findUnique({
      where: {
        user_id_client_id: {
          user_id: session.user.id,
          client_id: clientId,
        },
      },
    });

    if (existingConsent && !existingConsent.revoked_at) {
      // User has already granted active consent, auto-grant authorization code
      const grantResult = await grantOAuthAccess(
        clientId,
        redirectUri,
        state,
        codeChallenge,
        codeChallengeMethod,
        scope,
        nonce
      );
      if (grantResult.success && grantResult.redirectUrl) {
        return NextResponse.redirect(grantResult.redirectUrl);
      }
    }
  }

  const destinationPath = session
    ? `/${locale}/consent?${AUTH_REQUEST_PARAM}=${encodeURIComponent(authRequestToken)}`
    : `/${locale}/signin?${AUTH_REQUEST_PARAM}=${encodeURIComponent(authRequestToken)}`;

  return NextResponse.redirect(new URL(destinationPath, baseUrl));
}

import { getEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT, importJWK } from "jose";
import prisma from "@/lib/prisma";
import {
  createOAuthSession,
  createClientCredentialsSession,
} from "@/lib/session";
import { handleError } from "@/utils/error";
import { getSecret } from "@/lib/jwt-secret";
import {
  getOrCreateActiveSigningKey,
  decryptSigningPrivateKey,
} from "@/lib/sso/signing-keys";
import { handleSsoPreflight, withSsoCors } from "@/lib/sso/cors";
import { verifyClientSecret } from "@/lib/security/hash";
import { parseClientScopes } from "@/lib/oauth/scope-utils";
import crypto from "crypto";

export function OPTIONS() {
  return handleSsoPreflight();
}

/** Centralized OAuth 2.0 / RFC 6749 error responder */
function tokenError(status: number, error: string, description?: string) {
  return withSsoCors(
    NextResponse.json(
      { error, ...(description ? { error_description: description } : {}) },
      { status }
    )
  );
}

/** Atomically marks a JWT ID (jti) as consumed/revoked to prevent token replays */
async function consumeJtiAtomically(
  jti: string,
  expiresAt: Date
): Promise<boolean> {
  try {
    await prisma.revokedToken.create({
      data: { jti, expires_at: expiresAt },
    });
    return true;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return false;
    }
    throw err;
  }
}

/** Generates an RS256 OIDC-compliant ID token */
async function generateIdToken(
  userId: string,
  clientId: string,
  issuer: string,
  scope: string,
  nonce?: string
): Promise<string> {
  const signingKey = await getOrCreateActiveSigningKey();
  const privateJwk = decryptSigningPrivateKey(signingKey.privateKey);
  const privateKey = await importJWK(privateJwk, "RS256");

  return await new SignJWT({
    sub: userId,
    aud: clientId,
    iss: issuer,
    auth_time: Math.floor(Date.now() / 1000),
    scope,
    nonce,
  })
    .setProtectedHeader({ alg: "RS256", kid: signingKey.kid, typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

interface TokenRequestParams {
  clientId: string | null;
  clientSecret: string | null;
  code: string | null;
  grantType: string | null;
  redirectUri: string | null;
  codeVerifier: string | null;
  refreshToken: string | null;
  scope: string | null;
}

/** Extracts client credentials from Basic Auth header or Request body */
async function extractTokenParameters(
  request: NextRequest
): Promise<TokenRequestParams> {
  let clientId: string | null = null;
  let clientSecret: string | null = null;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const colonIndex = decoded.indexOf(":");
    if (colonIndex !== -1) {
      clientId = decodeURIComponent(decoded.slice(0, colonIndex));
      clientSecret = decodeURIComponent(decoded.slice(colonIndex + 1));
    }
  }

  const contentType = request.headers.get("content-type") || "";
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return {
      clientId: clientId || (form.get("client_id") as string),
      clientSecret: clientSecret || (form.get("client_secret") as string),
      code: form.get("code") as string,
      grantType: form.get("grant_type") as string,
      redirectUri: form.get("redirect_uri") as string,
      codeVerifier: (form.get("code_verifier") as string) || null,
      refreshToken: form.get("refresh_token") as string,
      scope: form.get("scope") as string,
    };
  }

  const json = await request.json().catch(() => ({}));
  return {
    clientId: clientId || json.client_id || null,
    clientSecret: clientSecret || json.client_secret || null,
    code: json.code || null,
    grantType: json.grant_type || null,
    redirectUri: json.redirect_uri || null,
    codeVerifier: json.code_verifier || null,
    refreshToken: json.refresh_token || null,
    scope: json.scope || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const params = await extractTokenParameters(request);
    const { grantType } = params;

    const issuer = (
      getEnv("NEXT_PUBLIC_BASE_URL", true) ||
      getEnv("NEXT_PUBLIC_APP_URL", true) ||
      request.nextUrl.origin
    ).replace(/\/+$/, "");

    switch (grantType) {
      case "client_credentials":
        return await handleClientCredentialsGrant(params);
      case "refresh_token":
        return await handleRefreshTokenGrant(params, issuer);
      case "authorization_code":
        return await handleAuthorizationCodeGrant(params, issuer);
      default:
        return tokenError(400, "unsupported_grant_type");
    }
  } catch (err: unknown) {
    const em = handleError(err, "Token endpoint unhandled exception");
    return tokenError(500, "server_error", em);
  }
}

// -------------------------------------------------------------
// Sub-handlers with early returns
// -------------------------------------------------------------

async function handleClientCredentialsGrant(params: TokenRequestParams) {
  const { clientId, clientSecret, scope } = params;
  if (!clientId || !clientSecret) {
    return tokenError(
      401,
      "invalid_client",
      "Client ID and client secret are required."
    );
  }

  const clientApp = await prisma.oAuthClientConfig.findUnique({
    where: { client_id: clientId },
  });

  if (!clientApp?.enabled || !clientApp.client_secret_hash) {
    return tokenError(
      401,
      "invalid_client",
      "Client application is invalid, disabled, or not confidential."
    );
  }

  const isSecretValid = await verifyClientSecret(
    clientSecret,
    clientApp.client_secret_hash
  );
  if (!isSecretValid) {
    return tokenError(401, "invalid_client", "Invalid client secret.");
  }

  const allowedScopes = new Set(parseClientScopes(clientApp.scopes));
  let effectiveScope = Array.from(allowedScopes).join(" ") || "openid profile email";

  if (scope) {
    const requested = scope.split(/\s+/).filter(Boolean);
    const unauthorizedScope = requested.find((s) => !allowedScopes.has(s));
    if (unauthorizedScope) {
      return tokenError(
        400,
        "invalid_scope",
        `Requested scope '${unauthorizedScope}' is not authorized for this client.`
      );
    }
    effectiveScope = requested.join(" ");
  }

  const session = await createClientCredentialsSession(clientId, effectiveScope);

  return withSsoCors(
    NextResponse.json({
      access_token: session.accessToken,
      token_type: "Bearer",
      expires_in: session.expiresIn,
      scope: session.scope,
    })
  );
}

async function handleRefreshTokenGrant(
  params: TokenRequestParams,
  issuer: string
) {
  const { refreshToken, clientId } = params;
  if (!refreshToken) {
    return tokenError(400, "invalid_request", "Missing refresh_token parameter.");
  }

  let payload;
  try {
    const verified = await jwtVerify(refreshToken, getSecret(), {
      algorithms: ["HS256"],
    });
    payload = verified.payload;
  } catch {
    return tokenError(400, "invalid_grant", "Invalid or expired refresh token.");
  }

  if (payload.type !== "refresh_token" || !payload.jti) {
    return tokenError(400, "invalid_grant", "Malformed or invalid refresh token.");
  }

  const tokenClientId = String(payload.client_id);
  if (clientId && clientId !== tokenClientId) {
    return tokenError(
      400,
      "invalid_grant",
      "Refresh token was not issued to this client."
    );
  }

  const clientApp = await prisma.oAuthClientConfig.findUnique({
    where: { client_id: tokenClientId },
  });

  if (!clientApp?.enabled) {
    return tokenError(
      401,
      "invalid_client",
      "Client application is invalid or disabled."
    );
  }

  const expDate = payload.exp
    ? new Date(payload.exp * 1000)
    : new Date(Date.now() + 30 * 86400000);

  const consumed = await consumeJtiAtomically(String(payload.jti), expDate);
  if (!consumed) {
    return tokenError(
      400,
      "invalid_grant",
      "Refresh token has already been redeemed or revoked."
    );
  }

  const effectiveScope = String(payload.scope || "openid profile email");
  const tokenData = await createOAuthSession(
    String(payload.sub),
    tokenClientId,
    effectiveScope
  );

  const idToken = await generateIdToken(
    String(payload.sub),
    tokenClientId,
    issuer,
    effectiveScope
  );

  return withSsoCors(
    NextResponse.json({
      access_token: tokenData.accessToken,
      token_type: "Bearer",
      expires_in: tokenData.expiresIn,
      refresh_token: tokenData.refreshToken,
      id_token: idToken,
      scope: tokenData.scope,
    })
  );
}

async function handleAuthorizationCodeGrant(
  params: TokenRequestParams,
  issuer: string
) {
  const { code, clientId, redirectUri, codeVerifier, clientSecret } = params;
  if (!code || !clientId || !redirectUri) {
    return tokenError(
      400,
      "invalid_request",
      "Missing required parameters (code, client_id, redirect_uri)."
    );
  }

  let payload;
  try {
    const verified = await jwtVerify(code, getSecret(), {
      algorithms: ["HS256"],
    });
    payload = verified.payload;
  } catch {
    return tokenError(
      400,
      "invalid_grant",
      "Invalid or expired authorization code."
    );
  }

  if (
    payload.type !== "authorization_code" ||
    payload.client_id !== clientId ||
    payload.redirect_uri !== redirectUri
  ) {
    return tokenError(
      400,
      "invalid_grant",
      "Authorization code parameters mismatch."
    );
  }

  const clientApp = await prisma.oAuthClientConfig.findUnique({
    where: { client_id: clientId },
  });

  if (!clientApp?.enabled) {
    return tokenError(401, "invalid_client", "Application is invalid or disabled.");
  }

  // Confidential client verification
  if (
    clientApp.client_type === "confidential" ||
    clientApp.token_endpoint_auth_method !== "none"
  ) {
    if (
      !clientSecret ||
      !(await verifyClientSecret(clientSecret, clientApp.client_secret_hash))
    ) {
      return tokenError(401, "invalid_client", "Client authentication failed.");
    }
  }

  // PKCE verification
  if (payload.code_challenge) {
    if (!codeVerifier) {
      return tokenError(
        400,
        "invalid_request",
        "code_verifier is required for PKCE-enabled clients."
      );
    }
    const computedChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    if (computedChallenge !== payload.code_challenge) {
      return tokenError(
        400,
        "invalid_grant",
        "PKCE code_verifier challenge mismatch."
      );
    }
  }

  // Replay prevention: consume JTI
  const expDate = payload.exp
    ? new Date(payload.exp * 1000)
    : new Date(Date.now() + 300000);

  const consumed = await consumeJtiAtomically(String(payload.jti), expDate);
  if (!consumed) {
    return tokenError(
      400,
      "invalid_grant",
      "Authorization code has already been redeemed."
    );
  }

  const effectiveScope = String(payload.scope || "openid profile email");
  const tokenData = await createOAuthSession(
    String(payload.user_id),
    clientId,
    effectiveScope
  );

  const idToken = await generateIdToken(
    String(payload.user_id),
    clientId,
    issuer,
    effectiveScope,
    payload.nonce ? String(payload.nonce) : undefined
  );

  return withSsoCors(
    NextResponse.json({
      access_token: tokenData.accessToken,
      token_type: "Bearer",
      expires_in: tokenData.expiresIn,
      refresh_token: tokenData.refreshToken,
      id_token: idToken,
      scope: tokenData.scope,
    })
  );
}

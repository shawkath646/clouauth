import { getEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT, importJWK } from "jose";
import prisma from "@/lib/prisma";
import { createOAuthSession, createClientCredentialsSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { getSecret } from "@/lib/jwt-secret";
import { getOrCreateActiveSigningKey } from "@/lib/sso/signing-keys";
import { handleSsoPreflight, withSsoCors } from "@/lib/sso/cors";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export function OPTIONS() {
  return handleSsoPreflight();
}

export async function POST(request: NextRequest) {
  try {
    let clientId: string | null = null;
    let _clientSecret: string | null = null;
    let code: string | null = null;
    let grantType: string | null = null;
    let redirectUri: string | null = null;
    let codeVerifier: string | null = null;
    let refreshToken: string | null = null;
    let scopeParam: string | null = null;

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
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      clientId = clientId || (formData.get("client_id") as string);
      _clientSecret = _clientSecret || (formData.get("client_secret") as string);
      code = formData.get("code") as string;
      grantType = formData.get("grant_type") as string;
      redirectUri = formData.get("redirect_uri") as string;
      codeVerifier = (formData.get("code_verifier") as string) || null;
      refreshToken = formData.get("refresh_token") as string;
      scopeParam = formData.get("scope") as string;
    } else {
      const json = await request.json().catch(() => ({}));
      clientId = clientId || json.client_id;
      _clientSecret = _clientSecret || json.client_secret;
      code = json.code;
      grantType = json.grant_type;
      redirectUri = json.redirect_uri;
      codeVerifier = json.code_verifier || null;
      refreshToken = json.refresh_token;
      scopeParam = json.scope;
    }

    const issuer =
      getEnv("NEXT_PUBLIC_BASE_URL", true) ||
      getEnv("NEXT_PUBLIC_APP_URL", true) ||
      request.nextUrl.origin;

    // -------------------------------------------------------------
    // 1. GRANT TYPE: client_credentials (Machine-to-Machine / Bridge)
    // -------------------------------------------------------------
    if (grantType === "client_credentials") {
      if (!clientId || !_clientSecret) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_client", error_description: "Client ID and client secret are required." },
            { status: 401 }
          )
        );
      }

      const clientApp = await prisma.oAuthClientConfig.findUnique({
        where: { client_id: clientId },
      });

      if (!clientApp || !clientApp.enabled) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_client", error_description: "Client application is invalid or disabled." },
            { status: 401 }
          )
        );
      }

      const isSecretValid = await bcrypt.compare(_clientSecret, clientApp.client_secret_hash);
      if (!isSecretValid) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_client", error_description: "Invalid client secret." },
            { status: 401 }
          )
        );
      }

      const effectiveScope = scopeParam || clientApp.scopes || "internal_service";
      const tokenSession = await createClientCredentialsSession(clientId, effectiveScope);

      return withSsoCors(
        NextResponse.json({
          access_token: tokenSession.accessToken,
          token_type: "Bearer",
          expires_in: tokenSession.expiresIn,
          scope: tokenSession.scope,
        })
      );
    }

    // -------------------------------------------------------------
    // 2. GRANT TYPE: refresh_token (OAuth 2.0 Token Refresh)
    // -------------------------------------------------------------
    if (grantType === "refresh_token") {
      if (!refreshToken) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_request", error_description: "Missing refresh_token parameter." },
            { status: 400 }
          )
        );
      }

      let payload;
      try {
        const verified = await jwtVerify(refreshToken, getSecret());
        payload = verified.payload;
      } catch {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_grant", error_description: "Invalid or expired refresh token." },
            { status: 400 }
          )
        );
      }

      if (payload.type !== "refresh_token") {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_grant", error_description: "Token is not a refresh token." },
            { status: 400 }
          )
        );
      }

      const jti = payload.jti as string | undefined;
      if (!jti) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_grant", error_description: "Malformed refresh token." },
            { status: 400 }
          )
        );
      }

      const isRevoked = await prisma.revokedToken.findUnique({ where: { jti } });
      if (isRevoked) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_grant", error_description: "Refresh token has been revoked." },
            { status: 400 }
          )
        );
      }

      // Rotate: Revoke the presented refresh token immediately
      const exp = payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await prisma.revokedToken.create({
        data: { jti, expires_at: exp },
      });

      const tokenClientId = String(payload.client_id);
      const tokenUserId = String(payload.sub);
      const tokenScope = scopeParam || String(payload.scope || "openid profile email");

      // Verify client application status
      const clientApp = await prisma.oAuthClientConfig.findUnique({
        where: { client_id: tokenClientId },
      });

      if (!clientApp || !clientApp.enabled) {
        return withSsoCors(
          NextResponse.json({ error: "invalid_client" }, { status: 401 })
        );
      }

      // If client is confidential, verify client credentials
      if (
        clientApp.client_type === "confidential" ||
        clientApp.token_endpoint_auth_method === "client_secret_post" ||
        clientApp.token_endpoint_auth_method === "client_secret_basic"
      ) {
        if (!_clientSecret || !(await bcrypt.compare(_clientSecret, clientApp.client_secret_hash))) {
          return withSsoCors(
            NextResponse.json(
              { error: "invalid_client", error_description: "Client secret validation failed." },
              { status: 401 }
            )
          );
        }
      }

      const newTokenData = await createOAuthSession(tokenUserId, tokenClientId, tokenScope);

      return withSsoCors(
        NextResponse.json({
          access_token: newTokenData.accessToken,
          token_type: "Bearer",
          expires_in: newTokenData.expiresIn,
          refresh_token: newTokenData.refreshToken,
          scope: newTokenData.scope,
        })
      );
    }

    // -------------------------------------------------------------
    // 3. GRANT TYPE: authorization_code (Standard OIDC Flow)
    // -------------------------------------------------------------
    if (grantType !== "authorization_code") {
      return withSsoCors(
        NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 })
      );
    }

    if (!code || !clientId) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_request", error_description: "Missing required parameters." },
          { status: 400 }
        )
      );
    }

    // Verify authorization code JWT
    let payload;
    try {
      const verified = await jwtVerify(code, getSecret());
      payload = verified.payload;
    } catch {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_grant", error_description: "Invalid or expired authorization code." },
          { status: 400 }
        )
      );
    }

    if (payload.type !== "authorization_code" || payload.client_id !== clientId) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_grant", error_description: "Authorization code mismatch." },
          { status: 400 }
        )
      );
    }

    if (redirectUri && payload.redirect_uri !== redirectUri) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_grant", error_description: "Redirect URI mismatch." },
          { status: 400 }
        )
      );
    }

    // Enforce single-use authorization code tracking via JTI
    const jti = payload.jti as string | undefined;
    if (!jti) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_grant", error_description: "Malformed authorization code." },
          { status: 400 }
        )
      );
    }

    const revokedCode = await prisma.revokedToken.findUnique({ where: { jti } });
    if (revokedCode) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_grant", error_description: "Authorization code has already been used." },
          { status: 400 }
        )
      );
    }

    // Revoke the code immediately upon use
    await prisma.revokedToken.create({
      data: {
        jti,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const clientApp = await prisma.oAuthClientConfig.findUnique({
      where: { client_id: clientId },
    });

    if (!clientApp || !clientApp.enabled) {
      return withSsoCors(
        NextResponse.json({ error: "invalid_client" }, { status: 401 })
      );
    }

    const codeChallenge = payload.code_challenge as string | undefined;
    const codeChallengeMethod = payload.code_challenge_method as string | undefined;

    // Strict PKCE enforcement based on client policy
    if (clientApp.pkce_required && !codeChallenge) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_grant", error_description: "PKCE code_challenge is required for this client." },
          { status: 400 }
        )
      );
    }

    if (codeChallenge) {
      if (!codeVerifier) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_request", error_description: "code_verifier is required for PKCE." },
            { status: 400 }
          )
        );
      }

      if (codeChallengeMethod === "S256") {
        const digest = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
        if (digest !== codeChallenge) {
          return withSsoCors(
            NextResponse.json(
              { error: "invalid_grant", error_description: "PKCE code_verifier does not match." },
              { status: 400 }
            )
          );
        }
      } else {
        if (codeVerifier !== codeChallenge) {
          return withSsoCors(
            NextResponse.json(
              { error: "invalid_grant", error_description: "PKCE code_verifier does not match." },
              { status: 400 }
            )
          );
        }
      }
    }

    const authMethod = clientApp.token_endpoint_auth_method;
    if (authMethod === "client_secret_post" || authMethod === "client_secret_basic") {
      if (!_clientSecret) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_client", error_description: "Client secret is required." },
            { status: 401 }
          )
        );
      }
      if (!clientApp.client_secret_hash) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_client", error_description: "Client secret hash not found." },
            { status: 401 }
          )
        );
      }
      const isSecretValid = await bcrypt.compare(_clientSecret, clientApp.client_secret_hash);
      if (!isSecretValid) {
        return withSsoCors(
          NextResponse.json(
            { error: "invalid_client", error_description: "Invalid client credentials." },
            { status: 401 }
          )
        );
      }
    }

    const userId = String(payload.user_id);
    const scope = String(payload.scope || "openid profile email");

    // Create OAuth Session
    const tokenData = await createOAuthSession(userId, clientId, scope);

    // Generate ID Token (OIDC standard)
    const signingKey = await getOrCreateActiveSigningKey();

    const privateJwk = JSON.parse(signingKey.privateKey);
    const privateKey = await importJWK(privateJwk, "RS256");

    const idToken = await new SignJWT({
      sub: userId,
      aud: clientId,
      iss: issuer,
      auth_time: Math.floor(Date.now() / 1000),
      scope,
      nonce: payload.nonce as string | undefined,
    })
      .setProtectedHeader({ alg: "RS256", kid: signingKey.kid, typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

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
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute POST");
    return withSsoCors(
      NextResponse.json({ error: "server_error", error_description: em }, { status: 500 })
    );
  }
}

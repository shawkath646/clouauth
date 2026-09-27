import { NextRequest } from "next/server";
import { jwtVerify, importJWK, JWTPayload } from "jose";
import { getSecret } from "@/lib/jwt-secret";
import prisma from "@/lib/prisma";
import { getActivePublicJwks } from "@/lib/sso/signing-keys";

export interface InterServiceAuthResult {
  authorized: boolean;
  error?: string;
  status?: number;
  clientId?: string;
  appId?: string;
  appName?: string;
  scopes?: string[];
  payload?: JWTPayload;
}

/**
 * Common security guard function to verify the Bearer JWT token of internal applications
 * calling /api/inter-services/v1/* bridge endpoints.
 */
export async function verifyInterServiceAuth(
  request: NextRequest
): Promise<InterServiceAuthResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      error: "Missing or invalid Authorization header. Expected 'Bearer <token>'.",
      status: 401,
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      authorized: false,
      error: "Bearer token is empty.",
      status: 401,
    };
  }

  let verifiedPayload: JWTPayload | null = null;

  // 1. Try verifying with shared internal HMAC secret (JWT_SECRET)
  try {
    const verified = await jwtVerify(token, getSecret());
    verifiedPayload = verified.payload;
  } catch {
    // Fallback: try dedicated INTERNAL_SERVICE_SECRET if configured
    const internalSecret = process.env.INTERNAL_SERVICE_SECRET;
    if (internalSecret) {
      try {
        const verified = await jwtVerify(
          token,
          new TextEncoder().encode(internalSecret)
        );
        verifiedPayload = verified.payload;
      } catch {
        // Continue to asymmetric check
      }
    }
  }

  // 2. Fallback: Try verifying with active RSA signing keys (for OIDC/RS256 ID tokens or access tokens)
  if (!verifiedPayload) {
    try {
      const publicJwks = await getActivePublicJwks();
      for (const jwk of publicJwks) {
        try {
          const key = await importJWK(jwk, "RS256");
          const verified = await jwtVerify(token, key);
          verifiedPayload = verified.payload;
          break;
        } catch {
          // Try next JWK
        }
      }
    } catch {
      // JWK verification failed
    }
  }

  if (!verifiedPayload) {
    return {
      authorized: false,
      error: "Invalid or expired Bearer token.",
      status: 401,
    };
  }

  // 3. Enforce JTI revocation check
  const jti = verifiedPayload.jti;
  if (jti) {
    const revoked = await prisma.revokedToken.findUnique({ where: { jti } });
    if (revoked) {
      return {
        authorized: false,
        error: "Bearer token has been revoked.",
        status: 401,
      };
    }
  }

  // 4. Resolve client / service identity
  const clientId = (verifiedPayload.client_id ||
    verifiedPayload.sub ||
    verifiedPayload.app_id ||
    verifiedPayload.service_id) as string;

  if (!clientId) {
    return {
      authorized: false,
      error: "Malformed Bearer token: missing client_id or subject identifier.",
      status: 401,
    };
  }

  // 5. Check if the token belongs to a registered developer application in OAuthClientConfig
  const clientApp = await prisma.oAuthClientConfig.findUnique({
    where: { client_id: clientId },
    include: { app: true },
  });

  if (clientApp) {
    if (!clientApp.enabled) {
      return {
        authorized: false,
        error: "The requesting application is currently disabled.",
        status: 403,
      };
    }

    const scopes =
      typeof verifiedPayload.scope === "string"
        ? verifiedPayload.scope.split(" ").filter(Boolean)
        : [];

    return {
      authorized: true,
      clientId: clientApp.client_id,
      appId: clientApp.app_id,
      appName: clientApp.app.name,
      scopes,
      payload: verifiedPayload,
    };
  }

  // 6. Check if this is an internal cluster service token (e.g. system backend service)
  const isInternalService =
    verifiedPayload.type === "internal_service" ||
    verifiedPayload.role === "internal" ||
    verifiedPayload.iss === "clouburstlab-internal";

  if (isInternalService) {
    const scopes =
      typeof verifiedPayload.scope === "string"
        ? verifiedPayload.scope.split(" ").filter(Boolean)
        : [];

    return {
      authorized: true,
      clientId,
      appId: clientId,
      appName: (verifiedPayload.service_name as string) || clientId,
      scopes,
      payload: verifiedPayload,
    };
  }

  // If token is an access_token for an end-user issued to a known client, allow it
  if (verifiedPayload.type === "access_token" && verifiedPayload.client_id) {
    return {
      authorized: true,
      clientId: String(verifiedPayload.client_id),
      appId: String(verifiedPayload.client_id),
      scopes:
        typeof verifiedPayload.scope === "string"
          ? verifiedPayload.scope.split(" ").filter(Boolean)
          : [],
      payload: verifiedPayload,
    };
  }

  return {
    authorized: false,
    error: "Unauthorized application credentials.",
    status: 403,
  };
}

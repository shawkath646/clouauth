import { NextRequest } from "next/server";
import { jwtVerify, importJWK, JWTPayload } from "jose";
import { getSecret } from "@/lib/jwt-secret";
import prisma from "@/lib/prisma";
import { getActivePublicJwks } from "@/lib/sso/signing-keys";

export interface InterServiceAuthResult {
  authorized: boolean;
  isInternalService?: boolean;
  error?: string;
  status?: number;
  clientId?: string;
  appId?: string;
  appName?: string;
  scopes?: string[];
  payload?: JWTPayload;
}

const ALLOWED_TOKEN_TYPES = new Set([
  "client_credentials",
  "internal_service",
  "access_token",
]);

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
  let signedByInternalSecret = false;

  // 1. Try verifying with dedicated INTERNAL_SERVICE_SECRET if configured
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET;
  if (internalSecret) {
    try {
      const verified = await jwtVerify(
        token,
        new TextEncoder().encode(internalSecret),
        { algorithms: ["HS256"] }
      );
      verifiedPayload = verified.payload;
      signedByInternalSecret = true;
    } catch {
      // Fall through to primary secret check
    }
  }

  // 2. Try verifying with shared internal HMAC secret (JWT_SECRET)
  if (!verifiedPayload) {
    try {
      const verified = await jwtVerify(token, getSecret(), {
        algorithms: ["HS256"],
      });
      verifiedPayload = verified.payload;
    } catch {
      // Continue to asymmetric check
    }
  }

  // 3. Fallback: Try verifying with active RSA signing keys (RS256)
  if (!verifiedPayload) {
    try {
      const publicJwks = await getActivePublicJwks();
      for (const jwk of publicJwks) {
        try {
          const key = await importJWK(jwk, "RS256");
          const verified = await jwtVerify(token, key, {
            algorithms: ["RS256"],
          });
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

  // Reject authorization codes or refresh tokens presented as Bearer tokens
  if (
    verifiedPayload.type &&
    typeof verifiedPayload.type === "string" &&
    !ALLOWED_TOKEN_TYPES.has(verifiedPayload.type)
  ) {
    return {
      authorized: false,
      error: "Token type is not permitted for inter-service authentication.",
      status: 401,
    };
  }

  // 4. Enforce JTI revocation check
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

  // 5. Resolve client / service identity
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

  const scopes =
    typeof verifiedPayload.scope === "string"
      ? verifiedPayload.scope.split(/\s+/).filter(Boolean)
      : [];

  // 6. Check if this is an internal cluster service token
  const isInternalClaim =
    signedByInternalSecret ||
    verifiedPayload.type === "internal_service" ||
    verifiedPayload.role === "internal" ||
    verifiedPayload.iss === "clouburstlab-internal";

  if (isInternalClaim) {
    return {
      authorized: true,
      isInternalService: true,
      clientId,
      appId: clientId,
      appName: (verifiedPayload.service_name as string) || clientId,
      scopes,
      payload: verifiedPayload,
    };
  }

  // 7. Check if the token belongs to a registered application in OAuthClientConfig
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

    let parsedClientScopes: string[] = [];
    if (clientApp.scopes) {
      const trimmed = clientApp.scopes.trim();
      if (trimmed.startsWith("[")) {
        try {
          const arr = JSON.parse(trimmed);
          if (Array.isArray(arr)) {
            parsedClientScopes = arr.map((s) => String(s).trim()).filter(Boolean);
          }
        } catch {
          parsedClientScopes = trimmed.split(/[\s,]+/).filter(Boolean);
        }
      } else {
        parsedClientScopes = trimmed.split(/[\s,]+/).filter(Boolean);
      }
    }
    const registeredScopes = new Set(parsedClientScopes);
    const hasInternalScope =
      registeredScopes.has("internal_service") &&
      scopes.includes("internal_service");

    return {
      authorized: true,
      isInternalService: hasInternalScope,
      clientId: clientApp.client_id,
      appId: clientApp.app_id,
      appName: clientApp.app.name,
      scopes,
      payload: verifiedPayload,
    };
  }

  // 8. End-user access_token issued to a known client
  if (verifiedPayload.type === "access_token" && verifiedPayload.client_id) {
    return {
      authorized: true,
      isInternalService: false,
      clientId: String(verifiedPayload.client_id),
      appId: String(verifiedPayload.client_id),
      scopes,
      payload: verifiedPayload,
    };
  }

  return {
    authorized: false,
    error: "Unauthorized application credentials.",
    status: 403,
  };
}

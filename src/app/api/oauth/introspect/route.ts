import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSecret } from "@/lib/jwt-secret";
import prisma from "@/lib/prisma";
import { handleSsoPreflight, withSsoCors } from "@/lib/sso/cors";
import { handleError } from "@/utils/error";

export function OPTIONS() {
  return handleSsoPreflight();
}

/**
 * RFC 7662 OAuth 2.0 Token Introspection Endpoint
 * Validates access/refresh tokens and returns metadata.
 */
export async function POST(request: NextRequest) {
  try {
    let token: string | null = null;
    let tokenTypeHint: string | null = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      token = (form.get("token") as string) || null;
      tokenTypeHint = (form.get("token_type_hint") as string) || null;
    } else {
      const json = await request.json().catch(() => ({}));
      token = json?.token || null;
      tokenTypeHint = json?.token_type_hint || null;
    }

    if (!token) {
      return withSsoCors(
        NextResponse.json(
          { error: "invalid_request", error_description: "Missing token parameter." },
          { status: 400 }
        )
      );
    }

    try {
      const { payload } = await jwtVerify(token, getSecret(), {
        algorithms: ["HS256"],
      });

      // Check if token was revoked
      if (payload.jti) {
        const revoked = await prisma.revokedToken.findUnique({
          where: { jti: payload.jti as string },
        });
        if (revoked) {
          return withSsoCors(NextResponse.json({ active: false }));
        }
      }

      // Token is valid and unrevoked
      return withSsoCors(
        NextResponse.json({
          active: true,
          scope: payload.scope || "openid profile email",
          client_id: payload.client_id || payload.aud || null,
          sub: payload.sub || null,
          exp: payload.exp || null,
          iat: payload.iat || null,
          iss: payload.iss || null,
          token_type: "Bearer",
        })
      );
    } catch {
      // Per RFC 7662 §2.2: If the token is invalid, expired, or revoked, return { "active": false } with HTTP 200
      return withSsoCors(NextResponse.json({ active: false }));
    }
  } catch (e: unknown) {
    const em = handleError(e, "Token introspection failure");
    return withSsoCors(
      NextResponse.json(
        { error: "server_error", error_description: em },
        { status: 500 }
      )
    );
  }
}

import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/utils/utils";

const secret = new TextEncoder().encode(getEnv("JWT_SECRET"));

export interface AuthRequestPayload {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state?: string | null;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
  nonce?: string | null;
  appName: string;
  appIcon?: string | null;
  appDescription?: string | null;
  appWebsite?: string | null;
}

const SSO_JWT_AUDIENCE = "clou-auth:sso";
const SSO_JWT_ISSUER = "clou-auth:authorize";

export async function signAuthRequest(payload: AuthRequestPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.clientId)
    .setIssuer(SSO_JWT_ISSUER)
    .setAudience(SSO_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyAuthRequest(
  token: string | null | undefined
): Promise<AuthRequestPayload | null> {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: SSO_JWT_ISSUER,
      audience: SSO_JWT_AUDIENCE,
    });

    if (
      !payload.clientId ||
      !payload.redirectUri ||
      !payload.responseType ||
      typeof payload.clientId !== "string" ||
      typeof payload.redirectUri !== "string"
    ) {
      return null;
    }

    return {
      clientId: payload.clientId as string,
      redirectUri: payload.redirectUri as string,
      responseType: payload.responseType as string,
      scope: (payload.scope as string) || "openid profile email",
      state: (payload.state as string | null) || null,
      codeChallenge: (payload.codeChallenge as string | null) || null,
      codeChallengeMethod: (payload.codeChallengeMethod as string | null) || null,
      nonce: (payload.nonce as string | null) || null,
      appName: (payload.appName as string) || "Application",
      appIcon: (payload.appIcon as string | null) || null,
      appDescription: (payload.appDescription as string | null) || null,
      appWebsite: (payload.appWebsite as string | null) || null,
    };
  } catch {
    return null;
  }
}

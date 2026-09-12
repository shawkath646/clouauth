"use server";

import { getEnv } from "@/utils/env";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { authenticateExternalUser, type SignInReturn } from "@/actions/auth/auth";
import { handleError } from "@/utils/error";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export async function signInWithGoogleOneTap(credential: string): Promise<SignInReturn> {
  try {
    if (!credential || typeof credential !== "string") {
      return { action: "ERROR", error: "Missing or invalid Google credential." };
    }

    const clientId = getEnv("GOOGLE_CLIENT_ID");

    const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });

    if (!payload.sub) {
      return { action: "ERROR", error: "Invalid token: missing subject claim." };
    }

    if (!payload.email) {
      return { action: "ERROR", error: "Invalid token: missing email claim." };
    }

    const isEmailVerified = payload.email_verified === true || payload.email_verified === "true";
    if (!isEmailVerified) {
      return { action: "ERROR", error: "Google email address is not verified." };
    }

    return await authenticateExternalUser(
      {
        provider: "google",
        providerUserId: payload.sub,
        email: (payload.email as string).toLowerCase().trim(),
        emailVerified: true,
        name: (payload.name as string) || null,
        avatar: (payload.picture as string) || null,
      },
      { rememberMe: true }
    );
  } catch (e: unknown) {
    const errorMessage = handleError(e, true);
    return { action: "ERROR", error: errorMessage };
  }
}

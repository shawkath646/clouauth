"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";
import { OAuthProviderFactory } from "@/lib/oauth/factory";
import { handleError } from "@/utils/error";
import { getSecret } from "@/lib/jwt-secret";
import { getSecureCookieOptions } from "@/utils/utils";
import { requireUserSession } from "@/actions/auth/helpers";

export async function grantOAuthAccess(
  client_id: string,
  redirect_uri: string,
  state?: string | null,
  code_challenge?: string | null,
  code_challenge_method?: string | null,
  scope?: string | null,
  nonce?: string | null
) {
  try {
    const session = await requireUserSession();

    if (!client_id || !redirect_uri) {
      return { success: false, error: "Invalid OAuth request. Missing required parameters." };
    }

    // Generate the Authorization Code (Stateless JWT)
    const authCode = await new SignJWT({
      client_id,
      redirect_uri,
      user_id: session.user.id,
      code_challenge,
      code_challenge_method,
      scope,
      nonce,
      type: "authorization_code",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m") // Code is valid for 5 minutes
      .sign(getSecret());

    // Build the redirect URL
    const url = new URL(redirect_uri);
    url.searchParams.set("code", authCode);
    if (state) {
      url.searchParams.set("state", state);
    }

    return { success: true, redirectUrl: url.toString() };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

async function redirectToProvider(provider: string, returnTo?: string | null) {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(
    `oauth_state_${provider}`,
    state,
    getSecureCookieOptions({ maxAge: 60 * 10 })
  );

  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    cookieStore.set(
      "oauth_return_to",
      returnTo,
      getSecureCookieOptions({ maxAge: 60 * 10 })
    );
  }

  const oauthProvider = OAuthProviderFactory.getProvider(provider);
  const authUrl = oauthProvider.getAuthorizationUrl(state);

  redirect(authUrl);
}

export async function initializeOAuthProvider(provider: string) {
  await requireUserSession();
  return redirectToProvider(provider);
}

export async function continueWithProvider(provider: string, returnTo?: string | null) {
  return redirectToProvider(provider, returnTo);
}

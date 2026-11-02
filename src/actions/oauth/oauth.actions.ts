"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";
import crypto from "crypto";
import { OAuthProviderFactory } from "@/lib/oauth/factory";
import { handleError } from "@/utils/error";
import { getSecureCookieOptions } from "@/utils/utils";
import { requireUserSession } from "@/actions/auth/helpers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { recordSecurityActivity } from "@/lib/security-activity";
import { parseClientScopes, parseRedirectUris } from "@/lib/oauth/scope-utils";
import { getSafeReturnTo } from "@/utils/url";
import { verifyAuthRequest } from "@/lib/oauth/auth-request";
import { getEnv } from "@/utils/utils";

const secret = new TextEncoder().encode(getEnv("JWT_SECRET"));

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
      return {
        success: false,
        error: "Invalid OAuth request. Missing required parameters.",
      };
    }

    // 1. Validate Client Application and Status
    const clientApp = await prisma.oAuthClientConfig.findUnique({
      where: { client_id },
      include: { app: true },
    });

    if (!clientApp || !clientApp.enabled) {
      return {
        success: false,
        error: "The requesting application could not be found or is disabled.",
      };
    }

    // 2. Validate Redirect URI against registered URIs using strict exact string matching (BCP 212)
    const registeredUris = parseRedirectUris(clientApp.redirect_uris);
    if (!registeredUris.includes(redirect_uri)) {
      return {
        success: false,
        error:
          "The provided redirect URI is not authorized for this application.",
      };
    }

    // 3. Enforce PKCE requirement for public clients or when pkce_required is enabled (RFC 7636 / BCP 212)
    const isPublicClient =
      clientApp.client_type === "public" ||
      clientApp.token_endpoint_auth_method === "none";

    if ((clientApp.pkce_required || isPublicClient) && !code_challenge) {
      return {
        success: false,
        error: "PKCE code_challenge (S256) is required for this application.",
      };
    }

    if (code_challenge && code_challenge_method && code_challenge_method !== "S256") {
      return {
        success: false,
        error: "Only S256 PKCE code_challenge_method is supported.",
      };
    }

    // 4. Validate requested scopes against registered client scopes
    const allowedScopes = new Set(parseClientScopes(clientApp.scopes));
    const requestedScopes = (scope || "openid profile email")
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const grantedScopes = requestedScopes.filter((s) => allowedScopes.has(s));
    const finalScope =
      grantedScopes.length > 0
        ? grantedScopes.join(" ")
        : Array.from(allowedScopes).join(" ") || "openid profile email";

    // 5. Generate the Authorization Code with single-use JTI
    const codeId = crypto.randomUUID();
    const authCode = await new SignJWT({
      client_id,
      redirect_uri,
      user_id: session.user.id,
      code_challenge: code_challenge || undefined,
      code_challenge_method: code_challenge ? "S256" : undefined,
      scope: finalScope,
      nonce: nonce || undefined,
      type: "authorization_code",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setJti(codeId)
      .setIssuedAt()
      .setExpirationTime("5m") // Code is valid for 5 minutes
      .sign(secret);

    // Persist OAuth consent for the user and client application
    await prisma.oAuthConsent.upsert({
      where: {
        user_id_client_id: {
          user_id: session.user.id,
          client_id,
        },
      },
      create: {
        user_id: session.user.id,
        client_id,
        scopes: finalScope,
        revoked_at: null,
      },
      update: {
        scopes: finalScope,
        revoked_at: null,
        updated_at: new Date(),
      },
    });

    // Build the redirect URL (RFC 6749 & RFC 9207 Issuer Identification)
    const url = new URL(redirect_uri);
    url.searchParams.set("code", authCode);
    if (state) {
      url.searchParams.set("state", state);
    }
    const baseURL = (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://auth.clouburstlab.com"
    ).replace(/\/$/, "");
    url.searchParams.set("iss", baseURL);

    return { success: true, redirectUrl: url.toString() };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function confirmConsentAction(authRequestToken: string) {
  let redirectUrl: string | null = null;
  try {
    const session = await requireUserSession();
    const authReq = await verifyAuthRequest(authRequestToken);

    if (!authReq) {
      return {
        success: false,
        error: "The authorization request has expired or is invalid. Please restart the request from the application.",
      };
    }

    const clientApp = await prisma.oAuthClientConfig.findUnique({
      where: { client_id: authReq.clientId },
      include: { app: true },
    });

    if (!clientApp || !clientApp.enabled) {
      return {
        success: false,
        error: "The application requesting authorization could not be found or has been disabled.",
      };
    }

    const registeredUris = parseRedirectUris(clientApp.redirect_uris);
    if (!registeredUris.includes(authReq.redirectUri)) {
      return {
        success: false,
        error: "The provided redirect URI is not authorized for this application.",
      };
    }

    const allowedScopes = new Set(parseClientScopes(clientApp.scopes));
    const requestedScopes = (authReq.scope || "openid profile email")
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const grantedScopes = requestedScopes.filter((s) => allowedScopes.has(s));
    const finalScope =
      grantedScopes.length > 0
        ? grantedScopes.join(" ")
        : Array.from(allowedScopes).join(" ") || "openid profile email";

    const codeId = crypto.randomUUID();
    const authCode = await new SignJWT({
      client_id: authReq.clientId,
      redirect_uri: authReq.redirectUri,
      user_id: session.user.id,
      code_challenge: authReq.codeChallenge || undefined,
      code_challenge_method: authReq.codeChallenge
        ? authReq.codeChallengeMethod || "S256"
        : undefined,
      scope: finalScope,
      nonce: authReq.nonce || undefined,
      type: "authorization_code",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setJti(codeId)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret);

    const url = new URL(authReq.redirectUri);
    url.searchParams.set("code", authCode);
    if (authReq.state) {
      url.searchParams.set("state", authReq.state);
    }
    const baseURL = (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://auth.clouburstlab.com"
    ).replace(/\/$/, "");
    url.searchParams.set("iss", baseURL);

    // Persist OAuth consent for the user and client application
    await prisma.oAuthConsent.upsert({
      where: {
        user_id_client_id: {
          user_id: session.user.id,
          client_id: authReq.clientId,
        },
      },
      create: {
        user_id: session.user.id,
        client_id: authReq.clientId,
        scopes: finalScope,
        revoked_at: null,
      },
      update: {
        scopes: finalScope,
        revoked_at: null,
        updated_at: new Date(),
      },
    });

    await recordSecurityActivity({
      userId: session.user.id,
      event: "OAUTH_CONSENT_GRANTED",
      title: `Authorized ${clientApp.app.name}`,
      description: `Granted OAuth access to ${clientApp.app.name} with scopes: ${finalScope}`,
    });

    redirectUrl = url.toString();
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "digest" in e &&
      typeof (e as { digest: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    const em = handleError(e, true);
    return { success: false, error: em };
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }
}

export async function denyConsentAction(authRequestToken: string) {
  const authReq = await verifyAuthRequest(authRequestToken);
  if (!authReq) {
    redirect("/profile");
  }

  const url = new URL(authReq.redirectUri);
  url.searchParams.set("error", "access_denied");
  url.searchParams.set(
    "error_description",
    "The user denied the authorization request."
  );
  if (authReq.state) {
    url.searchParams.set("state", authReq.state);
  }
  const baseURL = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://auth.clouburstlab.com"
  ).replace(/\/$/, "");
  url.searchParams.set("iss", baseURL);

  redirect(url.toString());
}

async function redirectToProvider(
  provider: string,
  returnTo?: string | null,
  options?: { sudoTempSessionId?: string }
) {
  const normalizedProvider = provider.toLowerCase();
  const state = crypto.randomUUID();
  const cookieStore = await cookies();

  // Save the target provider so callback routes know which account type was targeted
  cookieStore.set(
    "oauth_target_provider",
    normalizedProvider,
    getSecureCookieOptions({ maxAge: 60 * 10 })
  );

  cookieStore.set(
    `oauth_state_${normalizedProvider}`,
    state,
    getSecureCookieOptions({ maxAge: 60 * 10 })
  );

  // If this is a drive provider that uses the same callback as the base provider, also set parent state
  if (normalizedProvider === "google_drive") {
    cookieStore.set(
      "oauth_state_google",
      state,
      getSecureCookieOptions({ maxAge: 60 * 10 })
    );
  } else if (normalizedProvider === "onedrive") {
    cookieStore.set(
      "oauth_state_microsoft",
      state,
      getSecureCookieOptions({ maxAge: 60 * 10 })
    );
  }

  if (returnTo) {
    const safe = getSafeReturnTo(returnTo, "en");
    cookieStore.set(
      "oauth_return_to",
      safe,
      getSecureCookieOptions({ maxAge: 60 * 10 })
    );
  }

  if (options?.sudoTempSessionId) {
    cookieStore.set(
      "oauth_sudo_tid",
      options.sudoTempSessionId,
      getSecureCookieOptions({ maxAge: 60 * 10 })
    );
  }

  const oauthProvider = OAuthProviderFactory.getProvider(normalizedProvider);
  const authUrl = oauthProvider.getAuthorizationUrl(state);

  redirect(authUrl);
}

export async function initializeOAuthProvider(provider: string) {
  try {
    await requireUserSession();
    const normalized = provider.toLowerCase();
    if (normalized === "linkedin" || normalized === "dropbox") {
      redirect(`/profile/connected?error=${encodeURIComponent("This provider is currently not configured.")}`);
    }
    return await redirectToProvider(provider, "/profile/connected");
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "digest" in e &&
      typeof (e as { digest: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    const em = handleError(e, true);
    redirect(`/profile/connected?error=${encodeURIComponent(em)}`);
  }
}

export async function continueWithProvider(
  provider: string,
  returnTo?: string | null,
  options?: { sudoTempSessionId?: string }
) {
  return redirectToProvider(provider, returnTo, options);
}

export async function disconnectOAuthAccount(provider: string) {
  try {
    const session = await requireUserSession();
    const normalizedProvider = provider.toLowerCase();
    const isDrive = ["google_drive", "onedrive", "dropbox"].includes(
      normalizedProvider
    );

    if (!isDrive) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          password: true,
          oauth_accounts: true,
          two_factor: {
            include: {
              passkeys: true,
            },
          },
        },
      });

      const otherSocialAccounts =
        user?.oauth_accounts.filter(
          (acc) =>
            acc.provider.toLowerCase() !== normalizedProvider &&
            !["google_drive", "onedrive", "dropbox"].includes(
              acc.provider.toLowerCase()
            )
        ).length || 0;
      const hasPassword = Boolean(user?.password);
      const hasPasskey = Boolean(
        user?.two_factor?.passkeys?.length &&
          user.two_factor.passkeys.length > 0
      );

      if (!hasPassword && !hasPasskey && otherSocialAccounts === 0) {
        return {
          success: false,
          error:
            "You cannot disconnect your only login method. Please set a password or connect another login method first.",
        };
      }
    }

    await prisma.oAuthAccount.deleteMany({
      where: {
        user_id: session.user.id,
        provider: normalizedProvider,
      },
    });

    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    await recordSecurityActivity({
      userId: session.user.id,
      event: "OAUTH_DISCONNECTED",
      title: `Disconnected ${providerName}`,
      description: `Removed linked account for ${providerName}`,
    });

    revalidatePath("/profile/connected");
    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

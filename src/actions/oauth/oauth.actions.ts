"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";
import { OAuthProviderFactory } from "@/lib/oauth/factory";
import { handleError } from "@/utils/error";
import { getSecret } from "@/lib/jwt-secret";
import { getSecureCookieOptions } from "@/utils/utils";
import { requireUserSession } from "@/actions/auth/helpers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    cookieStore.set(
      "oauth_return_to",
      returnTo,
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
    const isDrive = ["google_drive", "onedrive", "dropbox"].includes(normalizedProvider);

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
            !["google_drive", "onedrive", "dropbox"].includes(acc.provider.toLowerCase())
        ).length || 0;
      const hasPassword = Boolean(user?.password);
      const hasPasskey = Boolean(
        user?.two_factor?.passkeys?.length && user.two_factor.passkeys.length > 0
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

    revalidatePath("/profile/connected");
    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

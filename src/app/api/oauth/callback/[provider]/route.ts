import { NextRequest, NextResponse } from "next/server";
import { OAuthProviderFactory } from "@/lib/oauth/factory";
import { getUserSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { encryptSymmetric } from "@/lib/encryption";
import crypto from "crypto";
import { authenticateExternalUser } from "@/actions/auth/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/profile/edit";
  redirectUrl.searchParams.set("field", "connected-accounts");

  try {
    const session = await getUserSession();

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      redirectUrl.searchParams.set("error", error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !state) {
      redirectUrl.searchParams.set("error", "missing_parameters");
      return NextResponse.redirect(redirectUrl);
    }

    const savedState = request.cookies.get(`oauth_state_${provider}`)?.value;
    if (
      !savedState ||
      savedState.length !== state.length ||
      !crypto.timingSafeEqual(Buffer.from(savedState), Buffer.from(state))
    ) {
      redirectUrl.searchParams.set("error", "invalid_state");
      return NextResponse.redirect(redirectUrl);
    }

    const oauthProvider = OAuthProviderFactory.getProvider(provider);
    const tokens = await oauthProvider.exchangeCode(code);
    const profile = await oauthProvider.getUserProfile(tokens.accessToken);

    const encryptedAccessToken = tokens.accessToken ? encryptSymmetric(tokens.accessToken) : null;
    const encryptedRefreshToken = tokens.refreshToken ? encryptSymmetric(tokens.refreshToken) : null;

    const result = await authenticateExternalUser({
      provider,
      providerUserId: profile.id,
      email: profile.email,
      emailVerified: true,
      name: profile.name,
      avatar: profile.avatar,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokens.expiresAt,
    });

    if (session) {
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete(`oauth_state_${provider}`);
      return response;
    }

    const loginRedirectUrl = request.nextUrl.clone();
    if (result.action === "METHOD_SELECTION") {
      loginRedirectUrl.pathname = "/signin";
      if (result.tempSessionId) loginRedirectUrl.searchParams.set("tempId", result.tempSessionId);
    } else if (result.action === "ACCOUNT_DISABLED") {
      loginRedirectUrl.pathname = "/signin";
      if ("tempSessionId" in result && result.tempSessionId) {
        loginRedirectUrl.searchParams.set("tempId", result.tempSessionId);
      } else {
        loginRedirectUrl.searchParams.set("error", "Account disabled");
      }
    } else if (result.action === "LOGIN_SUCCESS") {
      loginRedirectUrl.pathname = "/profile";
    } else if (result.action === "ERROR") {
      loginRedirectUrl.pathname = "/signin";
      loginRedirectUrl.searchParams.set("error", result.error || "Login failed");
    } else {
      loginRedirectUrl.pathname = "/signin";
      loginRedirectUrl.searchParams.set("error", "Login failed");
    }

    const response = NextResponse.redirect(loginRedirectUrl);
    response.cookies.delete(`oauth_state_${provider}`);
    return response;
  } catch (e: unknown) {
    handleError(e, "Failed to execute GET");
    redirectUrl.searchParams.set("error", "connection_failed");
    return NextResponse.redirect(redirectUrl);
  }
}

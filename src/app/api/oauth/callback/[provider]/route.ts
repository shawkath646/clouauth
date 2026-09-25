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
  const baseUrl = request.nextUrl.origin;

  try {
    const session = await getUserSession();
    const { searchParams } = request.nextUrl;
    
    const errorRedirect = (errorMsg: string) => {
      const url = session
        ? new URL(`/profile/edit?field=connected-accounts&error=${errorMsg}`, baseUrl)
        : new URL(`/signin?error=${errorMsg}`, baseUrl);
      return NextResponse.redirect(url);
    };

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) return errorRedirect(error);
    if (!code || !state) return errorRedirect("missing_parameters");

    const savedState = request.cookies.get(`oauth_state_${provider}`)?.value;
    if (
      !savedState ||
      savedState.length !== state.length ||
      !crypto.timingSafeEqual(Buffer.from(savedState), Buffer.from(state))
    ) {
      return errorRedirect("invalid_state");
    }

    const oauthProvider = OAuthProviderFactory.getProvider(provider);
    const tokens = await oauthProvider.exchangeCode(code);
    const profile = await oauthProvider.getUserProfile(tokens.accessToken);

    const result = await authenticateExternalUser({
      provider,
      providerUserId: profile.id,
      email: profile.email,
      emailVerified: true,
      name: profile.name,
      avatar: profile.avatar,
      accessToken: tokens.accessToken ? encryptSymmetric(tokens.accessToken) : null,
      refreshToken: tokens.refreshToken ? encryptSymmetric(tokens.refreshToken) : null,
      expiresAt: tokens.expiresAt,
    });

    let targetUrl: URL;

    if (session) {
      targetUrl = new URL("/profile/edit?field=connected-accounts", baseUrl);
    } else {
      const returnToCookie = request.cookies.get("oauth_return_to")?.value;
      const safeReturnTo = returnToCookie?.startsWith("/") && !returnToCookie.startsWith("//")
        ? returnToCookie
        : null;

      targetUrl = new URL("/signin", baseUrl);

      switch (result.action) {
        case "METHOD_SELECTION":
          if (result.tempSessionId) targetUrl.searchParams.set("tid", result.tempSessionId);
          if (safeReturnTo) targetUrl.searchParams.set("return_to", safeReturnTo);
          break;
        case "ACCOUNT_DISABLED":
          if (result.selfEnable && result.tempSessionId) {
            targetUrl.searchParams.set("tid", result.tempSessionId);
            targetUrl.searchParams.set("reenable", "true");
          } else {
            targetUrl.searchParams.set("error", "Account disabled");
          }
          break;
        case "LOGIN_SUCCESS":
          targetUrl = new URL(safeReturnTo || "/profile", baseUrl);
          break;
        default:
          targetUrl.searchParams.set("error", result.action === "ERROR" ? result.error : "Login failed");
          break;
      }
    }

    const response = NextResponse.redirect(targetUrl);
    response.cookies.delete(`oauth_state_${provider}`);
    if (!session) response.cookies.delete("oauth_return_to");
    
    return response;

  } catch (e: unknown) {
    handleError(e, "Failed to execute GET");
    return NextResponse.redirect(new URL("/signin?error=connection_failed", baseUrl));
  }
}
import { NextRequest, NextResponse } from "next/server";
import { OAuthProviderFactory } from "@/lib/oauth/factory";
import { getUserSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { encryptSymmetric } from "@/lib/encryption";
import crypto from "crypto";
import prisma from "@/lib/prisma";
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
        ? new URL(`/profile/connected?error=${encodeURIComponent(errorMsg)}`, baseUrl)
        : new URL(`/signin?error=${encodeURIComponent(errorMsg)}`, baseUrl);
      return NextResponse.redirect(url);
    };

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) return errorRedirect(error);
    if (!code || !state) return errorRedirect("missing_parameters");

    // Determine the effective target provider (e.g. google_drive vs google, onedrive vs microsoft)
    const targetProviderCookie = request.cookies.get("oauth_target_provider")?.value;
    const effectiveProvider = targetProviderCookie || provider;

    const savedState =
      request.cookies.get(`oauth_state_${effectiveProvider}`)?.value ||
      request.cookies.get(`oauth_state_${provider}`)?.value;

    if (
      !savedState ||
      savedState.length !== state.length ||
      !crypto.timingSafeEqual(Buffer.from(savedState), Buffer.from(state))
    ) {
      return errorRedirect("invalid_state");
    }

    const oauthProvider = OAuthProviderFactory.getProvider(effectiveProvider);
    const tokens = await oauthProvider.exchangeCode(code);
    const profile = await oauthProvider.getUserProfile(tokens.accessToken);

    // Sudo Re-authentication Handler
    const sudoTid = request.cookies.get("oauth_sudo_tid")?.value;
    if (sudoTid) {
      const tempSession = await prisma.tempSession.findUnique({
        where: { id: sudoTid },
        include: {
          user: {
            include: { oauth_accounts: true },
          },
        },
      });

      if (!tempSession || tempSession.expires_on < new Date() || tempSession.flow_type !== "sudo") {
        return errorRedirect("Verification session expired. Please try again.");
      }

      // Verify that the returned OAuth profile id matches the user's linked account for this provider
      const linkedAccount = tempSession.user.oauth_accounts.find(
        (acc) =>
          acc.provider.toLowerCase() === effectiveProvider.toLowerCase() ||
          acc.provider.toLowerCase() === provider.toLowerCase()
      );

      if (!linkedAccount || linkedAccount.provider_user_id !== profile.id) {
        return errorRedirect("Verification failed. The account you signed into does not match the linked account.");
      }

      // Valid Sudo verification: update active session last_authenticated_on
      if (session) {
        await prisma.userSession.update({
          where: { id: session.session.id },
          data: { last_authenticated_on: new Date() },
        });
      }

      await prisma.tempSession.delete({
        where: { id: sudoTid },
      }).catch(() => {});

      let returnTo = "/profile";
      if (tempSession.payload) {
        try {
          const parsed = JSON.parse(tempSession.payload);
          if (parsed.return_to && parsed.return_to.startsWith("/") && !parsed.return_to.startsWith("//")) {
            returnTo = parsed.return_to;
          }
        } catch {}
      }

      const response = NextResponse.redirect(new URL(returnTo, baseUrl));
      response.cookies.delete(`oauth_state_${provider}`);
      response.cookies.delete(`oauth_state_${effectiveProvider}`);
      response.cookies.delete("oauth_target_provider");
      response.cookies.delete("oauth_sudo_tid");
      response.cookies.delete("oauth_return_to");
      return response;
    }

    const result = await authenticateExternalUser({
      provider: effectiveProvider,
      providerUserId: profile.id,
      email: profile.email,
      emailVerified: Boolean(profile.emailVerified),
      name: profile.name,
      avatar: profile.avatar,
      accessToken: tokens.accessToken ? encryptSymmetric(tokens.accessToken) : null,
      refreshToken: tokens.refreshToken ? encryptSymmetric(tokens.refreshToken) : null,
      expiresAt: tokens.expiresAt,
    });

    let targetUrl: URL;

    if (session) {
      const returnToCookie = request.cookies.get("oauth_return_to")?.value;
      const safeReturnTo =
        returnToCookie?.startsWith("/") && !returnToCookie.startsWith("//")
          ? returnToCookie
          : "/profile/connected";
      targetUrl = new URL(safeReturnTo, baseUrl);
      targetUrl.searchParams.set("success", `${effectiveProvider}_connected`);
    } else {
      const returnToCookie = request.cookies.get("oauth_return_to")?.value;
      const safeReturnTo =
        returnToCookie?.startsWith("/") && !returnToCookie.startsWith("//")
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
    response.cookies.delete(`oauth_state_${effectiveProvider}`);
    response.cookies.delete("oauth_target_provider");
    response.cookies.delete("oauth_return_to");

    return response;
  } catch (e: unknown) {
    handleError(e, "Failed to execute GET");
    const session = await getUserSession();
    const fallbackPath = session ? "/profile/connected?error=connection_failed" : "/signin?error=connection_failed";
    return NextResponse.redirect(new URL(fallbackPath, baseUrl));
  }
}
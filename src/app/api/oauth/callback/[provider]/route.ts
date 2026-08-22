import { NextRequest, NextResponse } from "next/server";
import { OAuthProviderFactory } from "@/lib/oauth/factory";
import { getUserSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { handleError } from "@/utils/error";
import crypto from "crypto";

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
    if (!savedState || savedState.length !== state.length || !crypto.timingSafeEqual(Buffer.from(savedState), Buffer.from(state))) {
      redirectUrl.searchParams.set("error", "invalid_state");
      return NextResponse.redirect(redirectUrl);
    }

    const oauthProvider = OAuthProviderFactory.getProvider(provider);
    const tokens = await oauthProvider.exchangeCode(code);
    const profile = await oauthProvider.getUserProfile(tokens.accessToken);

    if (session) {
      // LINK ACCOUNT SCENARIO
      await prisma.oAuthAccount.upsert({
        where: {
          provider_provider_user_id: {
            provider: provider.toLowerCase(),
            provider_user_id: profile.id,
          }
        },
        update: {
          user_id: session.user.id,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiresAt,
        },
        create: {
          user_id: session.user.id,
          provider: provider.toLowerCase(),
          provider_user_id: profile.id,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiresAt,
        }
      });
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete(`oauth_state_${provider}`);
      return response;
    }

    // SIGN-IN / SIGN-UP SCENARIO
    const oauthAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_provider_user_id: {
          provider: provider.toLowerCase(),
          provider_user_id: profile.id,
        }
      },
      include: {
        user: {
          select: {
            id: true,
            account_status: true,
            password: true
          }
        }
      }
    });

    let targetUser = oauthAccount?.user;

    if (!targetUser) {
      // SIGN-UP
      const username = profile.email ? profile.email.split('@')[0] + Math.floor(Math.random() * 1000) : `user_${profile.id}`;
      const newUser = await prisma.user.create({
        data: {
          username: username,
          first_name: profile.name?.split(' ')[0] || 'User',
          last_name: profile.name?.split(' ').slice(1).join(' ') || '',
          avatar: profile.avatar || '',
          emails: profile.email ? {
            create: {
              address: profile.email,
              verified: true,
              is_primary: true
            }
          } : undefined,
          oauth_accounts: {
            create: {
              provider: provider.toLowerCase(),
              provider_user_id: profile.id,
              access_token: tokens.accessToken,
              refresh_token: tokens.refreshToken,
              expires_at: tokens.expiresAt,
            }
          },
          account_status: {
            create: {
              is_active: true
            }
          }
        },
        select: {
          id: true,
          account_status: true,
          password: true,
        }
      });
      targetUser = newUser;
    }

    // Call the shared processFinalSignIn from auth actions
    // Since we are not in a server action directly, we can just call it (it uses cookies() internally)
    const { processFinalSignIn } = await import("@/actions/auth/auth.actions");
    const result = await processFinalSignIn(targetUser, false);

    const loginRedirectUrl = request.nextUrl.clone();
    
    if (result.action === "METHOD_SELECTION") {
      loginRedirectUrl.pathname = "/signin";
      loginRedirectUrl.searchParams.set("require2FA", "true");
      if (result.tempSessionId) loginRedirectUrl.searchParams.set("tempSessionId", result.tempSessionId);
    } else if (result.action === "ACCOUNT_DISABLED") {
      loginRedirectUrl.pathname = "/signin";
      loginRedirectUrl.searchParams.set("error", "Account disabled");
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

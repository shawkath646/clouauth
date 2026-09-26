import prisma from "@/lib/prisma";
import { createSession, createTempSession, deleteTempSession, getUserSession } from "@/lib/session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { VerificationMethod } from "@/types/auth.types";
import {
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  verificationMethodMap,
  USER_WITH_AUTH_INCLUDE,
  upsertOAuthAccount,
  generateUniqueUsername,
  requireUserSession,
  getWebAuthnConfig,
} from "./helpers";
import { resolveUserAvatar } from "@/lib/avatar";

export { MAX_ATTEMPTS, LOCKOUT_DURATION_MS, verificationMethodMap };

export type AccountDisabledReturn<T extends boolean> = {
  action: "ACCOUNT_DISABLED";
  selfEnable: T;
} & (T extends true ? { tempSessionId: string } : object);

export type SignInReturn =
  | { action: "ERROR"; error: string }
  | AccountDisabledReturn<true>
  | AccountDisabledReturn<false>
  | {
      tempSessionId: string;
      action: "METHOD_SELECTION" | "VERIFICATION_PASSKEY" | "VERIFICATION_CODE" | "VERIFICATION_PHONE";
      methods: VerificationMethod[];
    }
  | { action: "LOGIN_SUCCESS" };

export type FinalSignInUser = {
  id: string;
  account_status?: {
    is_active: boolean;
    self_enable: boolean;
  } | null;
  preferences?: {
    theme?: string | null;
    language?: string | null;
  } | null;
};

export type UserWithAuthRelations = FinalSignInUser & {
  first_name?: string;
  last_name?: string;
  avatar?: string;
  two_factor?: {
    passkeys?: { id: string; rp_id?: string | null }[];
    totp?: { id: string; enabled?: boolean } | null;
    email?: { id: string } | null;
    email_id?: string | null;
  } | null;
};

export interface ExternalAuthProfile {
  provider: string;
  providerUserId: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
  avatar?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
}

export async function processFinalSignIn(
  user: FinalSignInUser,
  rememberMe: boolean,
  tempSessionId?: string
): Promise<SignInReturn> {
  if (user.account_status && !user.account_status.is_active) {
    if (user.account_status.self_enable) {
      const sessionId = tempSessionId || (await createTempSession(user.id, rememberMe)).id;
      return {
        action: "ACCOUNT_DISABLED",
        selfEnable: true,
        tempSessionId: sessionId,
      };
    }
    return { action: "ACCOUNT_DISABLED", selfEnable: false };
  }

  await createSession(user.id, rememberMe);

  if (user.preferences) {
    const cookieStore = await cookies();
    const secureCookie = process.env.NODE_ENV === "production";

    if (user.preferences.theme) {
      cookieStore.set("theme_pref", user.preferences.theme, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: secureCookie,
      });
    }
    if (user.preferences.language) {
      cookieStore.set("NEXT_LOCALE", user.preferences.language, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 31536000,
        secure: secureCookie,
      });
    }
  }

  revalidatePath("/", "layout");
  return { action: "LOGIN_SUCCESS" };
}

export async function evaluateAuthStepOrSignIn(
  user: UserWithAuthRelations,
  rememberMe: boolean,
  authMethod?: string
): Promise<SignInReturn> {
  // 1. Account status check
  if (user.account_status && !user.account_status.is_active) {
    if (user.account_status.self_enable) {
      const tempSession = await createTempSession(user.id, {
        rememberMe,
        authMethod,
        flowType: "reenable",
      });
      return {
        action: "ACCOUNT_DISABLED",
        selfEnable: true,
        tempSessionId: tempSession.id,
      };
    }
    return { action: "ACCOUNT_DISABLED", selfEnable: false };
  }

  // 2. 2FA check
  if (user.two_factor) {
    const methods: VerificationMethod[] = [];
    const tf = user.two_factor;
    const { rpID } = await getWebAuthnConfig();
    const validPasskeys = tf.passkeys?.filter((p) => !p.rp_id || p.rp_id === rpID);
    if (validPasskeys && validPasskeys.length > 0) methods.push(verificationMethodMap.passkeys);
    if (tf.totp && (tf.totp.enabled ?? true)) methods.push(verificationMethodMap.totp);
    if (tf.email || tf.email_id) methods.push(verificationMethodMap.email);

    if (methods.length > 0) {
      const tempSession = await createTempSession(user.id, {
        rememberMe,
        authMethod,
        flowType: "2fa",
      });
      return {
        action: "METHOD_SELECTION",
        tempSessionId: tempSession.id,
        methods,
      };
    }
  }

  // 3. Complete sign in
  return await processFinalSignIn(user, rememberMe);
}

export async function authenticateExternalUser(
  profile: ExternalAuthProfile,
  options: { rememberMe?: boolean; authMethod?: string } = {}
): Promise<SignInReturn> {
  const rememberMe = options.rememberMe ?? false;
  const authMethod = options.authMethod ?? `oauth:${profile.provider.toLowerCase()}`;
  const currentSession = await getUserSession();

  if (currentSession) {
    await upsertOAuthAccount(currentSession.user.id, profile);
    return { action: "LOGIN_SUCCESS" };
  }

  const existingOAuthAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_provider_user_id: {
        provider: profile.provider.toLowerCase(),
        provider_user_id: profile.providerUserId,
      },
    },
    include: {
      user: {
        include: USER_WITH_AUTH_INCLUDE,
      },
    },
  });

  let targetUser: UserWithAuthRelations | undefined = existingOAuthAccount?.user ?? undefined;

  // Refresh OAuth tokens and expiry on re-login for existing connected accounts
  if (existingOAuthAccount && targetUser) {
    await upsertOAuthAccount(targetUser.id, profile);
    if (!targetUser.avatar && profile.avatar) {
      const resolvedAvatar = await resolveUserAvatar(
        profile.avatar,
        targetUser.first_name || "User",
        targetUser.last_name || ""
      );
      if (resolvedAvatar) {
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { avatar: resolvedAvatar },
        });
        targetUser.avatar = resolvedAvatar;
      }
    }
  }

  // 3. Match by email if not found by provider_user_id
  if (!targetUser && profile.email) {
    const emailNormalized = profile.email.toLowerCase().trim();
    const existingEmail = await prisma.userEmail.findUnique({
      where: { address: emailNormalized },
      include: {
        user: {
          include: USER_WITH_AUTH_INCLUDE,
        },
      },
    });

    if (existingEmail) {
      if (!existingEmail.verified) {
        return {
          action: "ERROR",
          error:
            "An account with this email exists but is not verified. Please sign in with your credentials first.",
        };
      }

      // Link external OAuth account to existing verified user
      await upsertOAuthAccount(existingEmail.user.id, profile);
      targetUser = existingEmail.user;

      if (!targetUser.avatar && profile.avatar) {
        const resolvedAvatar = await resolveUserAvatar(
          profile.avatar,
          targetUser.first_name || "User",
          targetUser.last_name || ""
        );
        if (resolvedAvatar) {
          await prisma.user.update({
            where: { id: targetUser.id },
            data: { avatar: resolvedAvatar },
          });
          targetUser.avatar = resolvedAvatar;
        }
      }
    }
  }

  // 4. Provision new user if not found
  if (!targetUser) {
    const emailNormalized = profile.email?.toLowerCase().trim();
    const username = await generateUniqueUsername(emailNormalized || profile.providerUserId);

    const nameParts = (profile.name || "").trim().split(" ");
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || "";

    const avatar = await resolveUserAvatar(profile.avatar, firstName, lastName);

    const newUser = await prisma.user.create({
      data: {
        username,
        first_name: firstName,
        last_name: lastName,
        avatar,
        account_status: {
          create: {
            is_active: true,
          },
        },
        preferences: {
          create: {
            theme: "system",
            language: "en",
            timezone: "UTC",
          },
        },
        emails: emailNormalized
          ? {
              create: {
                address: emailNormalized,
                verified: Boolean(profile.emailVerified),
                is_primary: true,
                verified_on: profile.emailVerified ? new Date() : undefined,
              },
            }
          : undefined,
        oauth_accounts: {
          create: {
            provider: profile.provider.toLowerCase(),
            provider_user_id: profile.providerUserId,
            access_token: profile.accessToken,
            refresh_token: profile.refreshToken,
            expires_at: profile.expiresAt,
          },
        },
      },
      include: USER_WITH_AUTH_INCLUDE,
    });

    targetUser = newUser;
  }

  // 5. Evaluate auth step (account status, 2FA) or complete sign in
  return await evaluateAuthStepOrSignIn(targetUser, rememberMe, authMethod);
}

export async function finalizeSignIn(
  userId: string,
  tempSessionId: string
): Promise<SignInReturn> {
  const ts = await prisma.tempSession.findUnique({ where: { id: tempSessionId } });

  if (!ts || ts.user_id !== userId || ts.expires_on < new Date()) {
    return { action: "ERROR", error: "Session expired or invalid. Please sign in again." };
  }

  if (!ts.two_step_processed) {
    return { action: "ERROR", error: "Two-step verification incomplete." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { account_status: true, preferences: true },
  });

  if (!user) return { action: "ERROR", error: "User not found." };

  await deleteTempSession(tempSessionId);
  return processFinalSignIn(user, ts.remember_me, undefined);
}

export async function signOutAll(userId: string) {
  const session = await requireUserSession();
  if (session.user.id !== userId) {
    throw new Error("Unauthorized");
  }
  await prisma.userSession.updateMany({
    where: { user_id: userId, revoked_on: null },
    data: { revoked_on: new Date() },
  });
}

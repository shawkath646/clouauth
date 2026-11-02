import "server-only";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSession,
  createTempSession,
  deleteTempSession,
  getUserSession,
  signOut,
} from "@/lib/session";
import { resolveUserAvatar } from "@/lib/avatar";
import { recordSecurityActivity } from "@/lib/security-activity";
import type { VerificationMethod } from "@/types/auth.types";
import type { DBUser } from "@/types/user.types";
import {
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  verificationMethodMap,
  USER_WITH_AUTH_INCLUDE,
  oauthAccountKey,
  upsertOAuthAccount,
  getOAuthAccountOwnerId,
  generateUniqueUsername,
  requireUserSession,
  getAvailableMethods,
  isUniqueConstraintError,
} from "./helpers";

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
    action:
    | "METHOD_SELECTION"
    | "VERIFICATION_PASSKEY"
    | "VERIFICATION_CODE"
    | "VERIFICATION_PHONE";
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
  emails?: {
    id?: string;
    address: string;
    is_primary?: boolean;
    verified?: boolean;
  }[];
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

type ActivityDetails = { event?: string; title?: string; description?: string };

type ResolvedUser =
  | { user: UserWithAuthRelations; error?: never }
  | { user?: never; error: string };

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function describeSignIn(authMethod?: string): Required<ActivityDetails> {
  if (authMethod?.startsWith("oauth:")) {
    const provider = capitalize(authMethod.slice("oauth:".length));
    return {
      event: "LOGIN_OAUTH",
      title: `Signed in with ${provider}`,
      description: `OAuth sign-in using ${provider}`,
    };
  }

  switch (authMethod) {
    case "one_tap":
    case "google_one_tap":
      return {
        event: "LOGIN_GOOGLE_ONE_TAP",
        title: "Signed in with Google One Tap",
        description: "Fast sign-in with Google One Tap",
      };
    case "passkey":
      return {
        event: "LOGIN_PASSKEY",
        title: "Signed in with Passkey",
        description: "Biometric / security key authentication",
      };
    default:
      return {
        event: "LOGIN_PASSWORD",
        title: "Signed in successfully",
        description: "Signed in with password",
      };
  }
}

export async function processFinalSignIn(
  user: FinalSignInUser,
  rememberMe: boolean,
  tempSessionId?: string,
  activityDetails?: ActivityDetails
): Promise<SignInReturn> {
  const status = user.account_status;

  if (status && !status.is_active) {
    if (!status.self_enable) {
      return { action: "ACCOUNT_DISABLED", selfEnable: false };
    }
    const sessionId =
      tempSessionId ||
      (await createTempSession(user.id, { rememberMe, flowType: "reenable" })).id;
    return { action: "ACCOUNT_DISABLED", selfEnable: true, tempSessionId: sessionId };
  }

  await createSession(user.id, rememberMe);

  await recordSecurityActivity({
    userId: user.id,
    event: activityDetails?.event || "LOGIN_SUCCESS",
    title: activityDetails?.title || "Signed in successfully",
    description: activityDetails?.description || "New session established",
  });

  if (user.preferences?.theme) {
    const cookieStore = await cookies();
    cookieStore.set("theme_pref", user.preferences.theme, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  revalidatePath("/", "layout");
  return { action: "LOGIN_SUCCESS" };
}

export async function evaluateAuthStepOrSignIn(
  user: UserWithAuthRelations,
  rememberMe: boolean,
  authMethod?: string
): Promise<SignInReturn> {
  const status = user.account_status;
  const isDisabled = status ? !status.is_active : false;

  if (isDisabled && !status?.self_enable) {
    return { action: "ACCOUNT_DISABLED", selfEnable: false };
  }

  const methods = await getAvailableMethods(user);
  if (methods.length > 0) {
    const tempSession = await createTempSession(user.id, {
      rememberMe,
      authMethod,
      flowType: "2fa",
    });
    return { action: "METHOD_SELECTION", tempSessionId: tempSession.id, methods };
  }

  if (isDisabled) {
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

  return processFinalSignIn(user, rememberMe, undefined, describeSignIn(authMethod));
}

async function syncOAuthAvatarIfPlaceholder(
  user: UserWithAuthRelations,
  avatarUrl: string | null | undefined
) {
  const hasOnlyPlaceholder = !user.avatar || user.avatar.endsWith(".svg");
  if (!hasOnlyPlaceholder || !avatarUrl) return;

  const resolved = await resolveUserAvatar(
    avatarUrl,
    user.first_name || "User",
    user.last_name || ""
  );
  if (resolved && !resolved.endsWith(".svg")) {
    await prisma.user.update({ where: { id: user.id }, data: { avatar: resolved } });
    user.avatar = resolved;
  }
}

function scheduleAvatarSync(
  user: UserWithAuthRelations,
  avatarUrl: string | null | undefined
) {
  after(() => syncOAuthAvatarIfPlaceholder(user, avatarUrl).catch(() => { }));
}

async function linkExternalAccount(
  userId: string,
  profile: ExternalAuthProfile
): Promise<SignInReturn> {
  const ownerId = await getOAuthAccountOwnerId(profile);
  if (ownerId && ownerId !== userId) {
    return {
      action: "ERROR",
      error: "This account is already linked to another user.",
    };
  }

  await upsertOAuthAccount(userId, profile);

  const providerName = capitalize(profile.provider);
  await recordSecurityActivity({
    userId,
    event: "OAUTH_CONNECTED",
    title: `Connected ${providerName}`,
    description: `Linked ${providerName} account for sign-in and integration`,
  });

  return { action: "LOGIN_SUCCESS" };
}

async function findExistingExternalUser(
  profile: ExternalAuthProfile
): Promise<ResolvedUser | null> {
  const linked = await prisma.oAuthAccount.findUnique({
    where: oauthAccountKey(profile),
    include: { user: { include: USER_WITH_AUTH_INCLUDE } },
  });

  if (linked?.user) {
    await upsertOAuthAccount(linked.user.id, profile);
    scheduleAvatarSync(linked.user, profile.avatar);
    return { user: linked.user };
  }

  if (!profile.email) return null;

  const existingEmail = await prisma.userEmail.findUnique({
    where: { address: profile.email.toLowerCase().trim() },
    include: { user: { include: USER_WITH_AUTH_INCLUDE } },
  });
  if (!existingEmail) return null;

  if (!profile.emailVerified) {
    return {
      error:
        "Your email address is not verified with the provider. Please verify your email with the identity provider first or sign in using your credentials.",
    };
  }

  if (!existingEmail.verified) {
    return {
      error:
        "An account with this email exists but is not verified. Please sign in with your credentials first.",
    };
  }

  await upsertOAuthAccount(existingEmail.user.id, profile);
  scheduleAvatarSync(existingEmail.user, profile.avatar);
  return { user: existingEmail.user };
}

async function createExternalUser(profile: ExternalAuthProfile): Promise<DBUser> {
  const email = profile.email?.toLowerCase().trim();
  const username = await generateUniqueUsername(email || profile.providerUserId);

  const rawName = (profile.name || "").trim();
  const nameParts = rawName ? rawName.split(/\s+/) : [];
  let firstName = "User";
  let lastName = "";

  if (nameParts.length === 1) {
    firstName = nameParts[0];
  } else if (nameParts.length > 1) {
    lastName = nameParts[nameParts.length - 1];
    firstName = nameParts.slice(0, -1).join(" ");
  }

  const avatar = await resolveUserAvatar(profile.avatar, firstName, lastName);

  return prisma.user.create({
    data: {
      username,
      first_name: firstName,
      last_name: lastName,
      avatar,
      account_status: { create: { is_active: true } },
      preferences: { create: { theme: "system", language: "en", timezone: "UTC" } },
      emails: email
        ? {
          create: {
            address: email,
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
}

async function provisionExternalUser(
  profile: ExternalAuthProfile
): Promise<ResolvedUser> {
  for (let attempt = 0; ; attempt++) {
    try {
      return { user: await createExternalUser(profile) };
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt >= 2) throw error;
      const existing = await findExistingExternalUser(profile);
      if (existing) return existing;
    }
  }
}

export async function authenticateExternalUser(
  profile: ExternalAuthProfile,
  options: { rememberMe?: boolean; authMethod?: string } = {}
): Promise<SignInReturn> {
  const rememberMe = options.rememberMe ?? false;
  const authMethod = options.authMethod ?? `oauth:${profile.provider.toLowerCase()}`;
  const isOneTap = authMethod === "one_tap" || authMethod === "google_one_tap";

  const currentSession = isOneTap ? null : await getUserSession();
  if (currentSession) {
    return linkExternalAccount(currentSession.user.id, profile);
  }

  const resolved =
    (await findExistingExternalUser(profile)) ??
    (await provisionExternalUser(profile));

  if (!resolved.user) return { action: "ERROR", error: resolved.error };

  return evaluateAuthStepOrSignIn(resolved.user, rememberMe, authMethod);
}

export async function finalizeSignIn(
  userId: string,
  tempSessionId: string,
  activityDetails?: ActivityDetails
): Promise<SignInReturn> {
  const tempSession = await prisma.tempSession.findUnique({
    where: { id: tempSessionId },
  });

  if (
    !tempSession ||
    tempSession.user_id !== userId ||
    tempSession.expires_on < new Date() ||
    tempSession.flow_type === "sudo"
  ) {
    return {
      action: "ERROR",
      error: "Session expired or invalid. Please sign in again.",
    };
  }

  if (!tempSession.two_step_processed) {
    return { action: "ERROR", error: "Two-step verification incomplete." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { account_status: true, preferences: true },
  });

  if (!user) return { action: "ERROR", error: "User not found." };

  if (user.account_status && !user.account_status.is_active) {
    if (user.account_status.self_enable) {
      await prisma.tempSession.update({
        where: { id: tempSessionId },
        data: { flow_type: "reenable" },
      });
      return { action: "ACCOUNT_DISABLED", selfEnable: true, tempSessionId };
    }
    await deleteTempSession(tempSessionId);
    return { action: "ACCOUNT_DISABLED", selfEnable: false };
  }

  await deleteTempSession(tempSessionId);
  return processFinalSignIn(
    user,
    tempSession.remember_me,
    undefined,
    activityDetails || {
      event: "LOGIN_2FA",
      title: "Signed in with two-step verification",
      description: "Successfully completed two-step verification",
    }
  );
}

export async function signOutAll(userId: string) {
  const session = await requireUserSession();
  if (session.user.id !== userId) throw new Error("Unauthorized");

  await prisma.userSession.updateMany({
    where: { user_id: userId, revoked_on: null },
    data: { revoked_on: new Date() },
  });

  await recordSecurityActivity({
    userId,
    event: "ALL_SESSIONS_REVOKED",
    title: "All sessions signed out",
    description: "Signed out of all active devices and sessions",
  });

  await signOut(session.session.id);
}
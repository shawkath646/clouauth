import "server-only";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  getUser,
  getUserEmails,
  getUserPreferences,
  updateUser,
  findEmailRecord,
  createUserWithAccount,
  verifyUserEmail,
} from "@/lib/users";
import {
  getTwoFactor,
  findLinkedOAuthAccount,
} from "@/lib/credentials";
import {
  createSession,
  createTempSession,
  deleteTempSession,
  getTempSession,
  updateTempSession,
  revokeAllUserSessions,
  getUserSession,
  signOut,
} from "@/lib/session";
import { resolveUserAvatar } from "@/lib/avatar";
import { recordSecurityActivity } from "@/lib/security-activity";
import type { VerificationMethod } from "@/types/auth.types";
import {
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  verificationMethodMap,
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function getUserWithAuthRelations(userId: string): Promise<UserWithAuthRelations | null> {
  const user = await getUser(userId);
  if (!user) return null;
  const [emails, twoFactor, prefs] = await Promise.all([
    getUserEmails(userId),
    getTwoFactor(userId),
    getUserPreferences(userId),
  ]);
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    avatar: user.avatar,
    account_status: user.account_status,
    preferences: prefs,
    emails,
    two_factor: {
      passkeys: twoFactor.passkeys,
      totp: twoFactor.totp_enabled ? { id: "totp", enabled: true } : null,
      email: twoFactor.email_id ? { id: twoFactor.email_id } : null,
      email_id: twoFactor.email_id,
    },
  };
}

function describeSignIn(authMethod: string): ActivityDetails {
  if (authMethod.startsWith("oauth:")) {
    const provider = capitalize(authMethod.slice("oauth:".length));
    return {
      event: "LOGIN_OAUTH",
      title: `Signed in with ${provider}`,
      description: `Authenticated successfully via ${provider} OAuth`,
    };
  }

  switch (authMethod) {
    case "passkey":
      return {
        event: "LOGIN_PASSKEY",
        title: "Signed in with passkey",
        description: "Authenticated using FIDO2/WebAuthn biometrics",
      };
    case "one_tap":
    case "google_one_tap":
      return {
        event: "LOGIN_GOOGLE_ONE_TAP",
        title: "Signed in with Google One Tap",
        description: "Authenticated via Google One Tap prompt",
      };
    case "credentials":
    default:
      return {
        event: "LOGIN_PASSWORD",
        title: "Signed in with password",
        description: "Standard password authentication",
      };
  }
}

export async function processFinalSignIn(
  user: FinalSignInUser,
  rememberMe: boolean = false,
  redirectUrl?: string,
  activityDetails?: ActivityDetails
): Promise<SignInReturn> {
  const cookieStore = await cookies();

  if (user.preferences?.theme) {
    cookieStore.set("theme_pref", user.preferences.theme, {
      path: "/",
      maxAge: 31536000,
    });
  }

  await createSession(user.id, rememberMe);

  if (activityDetails?.event && activityDetails?.title) {
    await recordSecurityActivity({
      userId: user.id,
      event: activityDetails.event,
      title: activityDetails.title,
      description: activityDetails.description,
    });
  }

  if (redirectUrl) revalidatePath(redirectUrl);
  return { action: "LOGIN_SUCCESS" };
}

export async function evaluateAuthStepOrSignIn(
  user: UserWithAuthRelations,
  rememberMe: boolean,
  authMethod: string
): Promise<SignInReturn> {
  const availableMethods = await getAvailableMethods(user);

  if (availableMethods.length > 0) {
    const isSingle = availableMethods.length === 1;
    const initialAction = isSingle
      ? availableMethods[0].type === "passkey"
        ? "VERIFICATION_PASSKEY"
        : "VERIFICATION_CODE"
      : "METHOD_SELECTION";

    const tempSession = await createTempSession(user.id, {
      rememberMe,
      authMethod,
      flowType: "2fa",
    });

    return {
      action: initialAction,
      methods: availableMethods,
      tempSessionId: tempSession.id,
    };
  }

  const isDisabled = user.account_status && !user.account_status.is_active;
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
    await updateUser(user.id, { avatar: resolved });
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
  const linked = await findLinkedOAuthAccount(profile.provider, profile.providerUserId);

  if (linked?.userId) {
    const user = await getUserWithAuthRelations(linked.userId);
    if (user) {
      await upsertOAuthAccount(user.id, profile);
      scheduleAvatarSync(user, profile.avatar);
      return { user };
    }
  }

  if (!profile.email) return null;

  const existingEmail = await findEmailRecord(profile.email);
  if (!existingEmail) return null;

  const user = await getUserWithAuthRelations(existingEmail.user_id);
  if (!user) return null;

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

  await upsertOAuthAccount(user.id, profile);
  scheduleAvatarSync(user, profile.avatar);
  return { user };
}

async function createExternalUser(profile: ExternalAuthProfile): Promise<UserWithAuthRelations> {
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

  const createdUser = await createUserWithAccount({
    username,
    first_name: firstName,
    last_name: lastName,
    avatar,
    email: email || `${username}@placeholder.local`,
  });

  if (email && profile.emailVerified) {
    const emails = await getUserEmails(createdUser.id);
    if (emails[0]) {
      await verifyUserEmail(createdUser.id, emails[0].id);
    }
  }

  await upsertOAuthAccount(createdUser.id, profile);

  return (await getUserWithAuthRelations(createdUser.id))!;
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
  const tempSession = await getTempSession(tempSessionId);

  if (
    !tempSession ||
    tempSession.user_id !== userId ||
    new Date(tempSession.expires_on) < new Date() ||
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

  const user = await getUser(userId);

  if (!user) return { action: "ERROR", error: "User not found." };

  if (user.account_status && !user.account_status.is_active) {
    if (user.account_status.self_enable) {
      await updateTempSession(tempSessionId, { flow_type: "reenable" });
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

  await revokeAllUserSessions(userId);

  await recordSecurityActivity({
    userId,
    event: "ALL_SESSIONS_REVOKED",
    title: "All sessions signed out",
    description: "Signed out of all active devices and sessions",
  });

  await signOut();
}

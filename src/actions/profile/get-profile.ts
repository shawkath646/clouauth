import { cache } from "react";
import { connection } from "next/server";
import {
  getUser,
  getUserEmails,
  getUserAddresses,
  getUserPreferences,
  getUserNotifications,
} from "@/lib/users";
import {
  getPasswordCredential,
  getTwoFactor,
  getRecoveryCodes,
  getLinkedOAuthAccounts,
} from "@/lib/credentials";
import { getUserSecurityActivities } from "@/lib/security-activity";
import { getUserSessions, getUserSession } from "@/lib/session";
import type {
  MinimalProfile,
  ExtendedProfile,
  SecuredFullProfile,
  FullProfile,
} from "@/types/profile.types";
import { handleError } from "@/utils/error";

export const getMinimalProfile = cache(async (): Promise<{ success: boolean; data?: MinimalProfile; error?: string }> => {
  await connection();
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const [user, emails] = await Promise.all([
      getUser(sessionData.user.id),
      getUserEmails(sessionData.user.id),
    ]);

    if (!user) return { success: false, error: "User not found" };

    const primaryEmail = emails.find((e) => e.is_primary) || emails[0];

    const minimal: MinimalProfile = {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar: user.avatar,
      bio: user.bio,
      date_of_birth: user.date_of_birth || undefined,
      primary_email: primaryEmail?.address || "",
    };

    return { success: true, data: minimal };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute getMinimalProfile");
    return { success: false, error: em };
  }
});

export const getExtendedProfile = cache(async (): Promise<{ success: boolean; data?: ExtendedProfile; error?: string }> => {
  await connection();
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const [user, emails, addresses, preferences] = await Promise.all([
      getUser(sessionData.user.id),
      getUserEmails(sessionData.user.id),
      getUserAddresses(sessionData.user.id),
      getUserPreferences(sessionData.user.id),
    ]);

    if (!user) return { success: false, error: "User not found" };

    const primaryEmail = emails.find((e) => e.is_primary) || emails[0];

    const extended: ExtendedProfile = {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar: user.avatar,
      bio: user.bio,
      date_of_birth: user.date_of_birth || undefined,
      primary_email: primaryEmail?.address || "",
      addresses,
      created_on: new Date(user.created_on).toISOString(),
      pronouns: user.pronouns,
      username_last_changed: user.username_last_changed
        ? new Date(user.username_last_changed).toISOString()
        : null,
      preferences: preferences || {
        user_id: user.id,
        theme: "system" as const,
        language: "en",
        timezone: "UTC",
        profile_visibility: "public" as const,
      },
    };

    return { success: true, data: extended };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute getExtendedProfile");
    return { success: false, error: em };
  }
});

export const getSecuredFullProfile = cache(async (): Promise<{ success: boolean; data?: SecuredFullProfile; error?: string }> => {
  await connection();
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const [user, emails, addresses, preferences, notifications, oauthAccounts] = await Promise.all([
      getUser(sessionData.user.id),
      getUserEmails(sessionData.user.id),
      getUserAddresses(sessionData.user.id),
      getUserPreferences(sessionData.user.id),
      getUserNotifications(sessionData.user.id),
      getLinkedOAuthAccounts(sessionData.user.id),
    ]);

    if (!user) return { success: false, error: "User not found" };

    const securedProfile: SecuredFullProfile = {
      user: {
        ...user,
        account_status: user.account_status
          ? {
              is_active: Boolean(user.account_status.is_active),
              self_enable: Boolean(user.account_status.self_enable),
              reason: user.account_status.reason ?? null,
            }
          : null,
        created_on: new Date(user.created_on).toISOString(),
        updated_on: new Date(user.updated_on).toISOString(),
        username_last_changed: user.username_last_changed
          ? new Date(user.username_last_changed).toISOString()
          : null,
      },
      emails: emails.map((email) => ({
        id: email.id,
        user_id: email.user_id,
        address: email.address,
        verified: email.verified,
        is_primary: email.is_primary,
        added_on: new Date(email.added_on).toISOString(),
        verified_on: email.verified_on ? new Date(email.verified_on).toISOString() : null,
      })),
      addresses,
      preferences: preferences || {
        user_id: user.id,
        theme: "system",
        language: "en",
        timezone: "UTC",
        profile_visibility: "public",
      },
      notifications: notifications || {
        user_id: user.id,
        email_security: true,
        email_marketing: false,
        login_alerts: true,
        product_updates: true,
      },
      oauth_accounts: oauthAccounts.map((acc) => ({
        id: acc.id,
        user_id: acc.user_id,
        provider: acc.provider,
        provider_user_id: acc.provider_user_id,
        created_on: new Date(acc.created_on).toISOString(),
      })),
    };

    return { success: true, data: securedProfile };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute getSecuredFullProfile");
    return { success: false, error: em };
  }
});

export const getFullProfile = cache(async (): Promise<{ success: boolean; data?: FullProfile; error?: string }> => {
  await connection();
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = sessionData.user.id;

    const [
      user,
      emails,
      addresses,
      preferences,
      notifications,
      password,
      twoFactor,
      recoveryCodes,
      sessions,
      oauthAccounts,
      securityActivities,
    ] = await Promise.all([
      getUser(userId),
      getUserEmails(userId),
      getUserAddresses(userId),
      getUserPreferences(userId),
      getUserNotifications(userId),
      getPasswordCredential(userId),
      getTwoFactor(userId),
      getRecoveryCodes(userId),
      getUserSessions(userId),
      getLinkedOAuthAccounts(userId),
      getUserSecurityActivities(userId, 10).catch(() => []),
    ]);

    if (!user) return { success: false, error: "User not found" };

    const activeSessions = sessions.filter(
      (s) => !s.revoked_on && new Date(s.expires_on) > new Date()
    );

    const fullProfile: FullProfile = {
      user: {
        ...user,
        account_status: user.account_status
          ? {
              is_active: Boolean(user.account_status.is_active),
              self_enable: Boolean(user.account_status.self_enable),
              reason: user.account_status.reason ?? null,
            }
          : null,
        created_on: new Date(user.created_on).toISOString(),
        updated_on: new Date(user.updated_on).toISOString(),
        username_last_changed: user.username_last_changed
          ? new Date(user.username_last_changed).toISOString()
          : null,
      },
      emails: emails.map((email) => ({
        id: email.id,
        user_id: email.user_id,
        address: email.address,
        verified: email.verified,
        is_primary: email.is_primary,
        added_on: new Date(email.added_on).toISOString(),
        verified_on: email.verified_on ? new Date(email.verified_on).toISOString() : null,
      })),
      addresses,
      preferences: preferences || {
        user_id: user.id,
        theme: "system",
        language: "en",
        timezone: "UTC",
        profile_visibility: "public",
      },
      notifications: notifications || {
        user_id: user.id,
        email_security: true,
        email_marketing: false,
        login_alerts: true,
        product_updates: true,
      },
      password: password
        ? {
            user_id: password.user_id,
            password_hash: "[REDACTED]",
            last_changed_on: new Date(password.last_changed_on).toISOString(),
            force_change: password.force_change,
            failed_attempts: password.failed_attempts || 0,
            locked_until: password.locked_until
              ? new Date(password.locked_until).toISOString()
              : null,
          }
        : null,
      passkeys:
        twoFactor.passkeys?.map((p) => ({
          ...p,
          public_key: "[REDACTED]",
          device_name: p.device_name ?? undefined,
          created_on: new Date(p.created_on).toISOString(),
          last_used_on: p.last_used_on ? new Date(p.last_used_on).toISOString() : undefined,
        })) ?? [],
      has_totp: Boolean(twoFactor.totp_enabled),
      recovery_codes: recoveryCodes.map((c) => ({
        id: c.id,
        used: c.used,
        created_on: new Date(c.created_on).toISOString(),
      })),
      sessions: activeSessions.map((s) => ({
        id: s.id,
        user_id: s.user_id,
        session_token_hash: "[REDACTED]",
        refresh_token_hash: "[REDACTED]",
        created_on: new Date(s.created_on).toISOString(),
        updated_on: new Date(s.updated_on).toISOString(),
        session_expires_on: new Date(s.session_expires_on).toISOString(),
        expires_on: new Date(s.expires_on).toISOString(),
        revoked_on: s.revoked_on ? new Date(s.revoked_on).toISOString() : null,
        ip_address: s.ip_address,
        user_agent: s.user_agent,
        device_name: s.device_name,
      })),
      oauth_accounts: oauthAccounts.map((acc) => ({
        id: acc.id,
        user_id: acc.user_id,
        provider: acc.provider,
        provider_user_id: acc.provider_user_id,
        created_on: new Date(acc.created_on).toISOString(),
        access_token: "[REDACTED]",
        refresh_token: "[REDACTED]",
        expires_at: acc.expires_at,
      })),
      current_session_id: sessionData.session.id,
      security_activities: (securityActivities || []).map((act) => ({
        ...act,
        created_on:
          act.created_on instanceof Date
            ? act.created_on.toISOString()
            : String(act.created_on),
      })),
    };

    return { success: true, data: fullProfile };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute getFullProfile");
    return { success: false, error: em };
  }
});

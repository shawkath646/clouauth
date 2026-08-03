"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import type { 
    MinimalProfile, 
    ExtendedProfile, 
    SecuredFullProfile, 
    FullProfile 
} from "@/types/profile.types";
import type { DBUserPreference } from "@/types/preferences.types";
import { getErrorMessage } from "@/misc/utils";

export async function getMinimalProfile(): Promise<{ success: boolean, data?: MinimalProfile, error?: string }> {
    try {
        const sessionData = await getUserSession();
        if (!sessionData) {
            return { success: false, error: "Unauthorized" };
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionData.user.id },
            include: {
                emails: { where: { is_primary: true } }
            }
        });

        if (!user) return { success: false, error: "User not found" };

        const minimal: MinimalProfile = {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar: user.avatar,
            bio: user.bio,
            date_of_birth: user.date_of_birth || undefined,
            primary_email: user.emails[0]?.address || ""
        };

        return { success: true, data: minimal };
    } catch (e: unknown) {
    const em = getErrorMessage(e);
        return { success: false, error: em };
    }
}

export async function getExtendedProfile(): Promise<{ success: boolean, data?: ExtendedProfile, error?: string }> {
    try {
        const sessionData = await getUserSession();
        if (!sessionData) {
            return { success: false, error: "Unauthorized" };
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionData.user.id },
            include: {
                emails: { where: { is_primary: true } },
                addresses: true,
                preferences: true
            }
        });

        if (!user) return { success: false, error: "User not found" };

        const extended: ExtendedProfile = {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar: user.avatar,
            bio: user.bio,
            date_of_birth: user.date_of_birth || undefined,
            primary_email: user.emails[0]?.address || "",
            addresses: user.addresses,
            created_on: user.created_on.toISOString(),
            pronouns: user.pronouns,
            username_last_changed: user.username_last_changed,
            preferences: (user.preferences as unknown as DBUserPreference) || {
                user_id: user.id,
                theme: "system" as const,
                language: "en",
                timezone: "UTC"
            }
        };

        return { success: true, data: extended };
    } catch (e: unknown) {
    const em = getErrorMessage(e);
        return { success: false, error: em };
    }
}

export async function getSecuredFullProfile(): Promise<{ success: boolean, data?: SecuredFullProfile, error?: string }> {
    try {
        const sessionData = await getUserSession();
        if (!sessionData) {
            return { success: false, error: "Unauthorized" };
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionData.user.id },
            include: {
                emails: true,
                addresses: true,
                preferences: true,
                notifications: true,
                oauth_accounts: true,
            }
        });

        if (!user) return { success: false, error: "User not found" };

        const securedProfile: SecuredFullProfile = {
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar: user.avatar,
                bio: user.bio,
                date_of_birth: user.date_of_birth,
                pronouns: user.pronouns,
                username_last_changed: user.username_last_changed,
                is_active: user.is_active,
                created_on: user.created_on,
                updated_on: user.updated_on
            },
            emails: user.emails,
            addresses: user.addresses,
            preferences: (user.preferences as unknown as DBUserPreference) || {
                user_id: user.id,
                theme: "system",
                language: "en",
                timezone: "UTC"
            },
            notifications: user.notifications || {
                user_id: user.id,
                email_security: true,
                email_marketing: false,
                login_alerts: true,
                product_updates: true
            },
            oauth_accounts: user.oauth_accounts.map(acc => ({
                id: acc.id,
                user_id: acc.user_id,
                provider: acc.provider,
                provider_user_id: acc.provider_user_id,
                created_on: acc.created_on,
                // Do not expose raw tokens
                access_token: undefined,
                refresh_token: undefined,
                expires_at: acc.expires_at
            }))
        };

        return { success: true, data: securedProfile };
    } catch (e: unknown) {
    const em = getErrorMessage(e);
        return { success: false, error: em };
    }
}

export async function getFullProfile(): Promise<{ success: boolean, data?: FullProfile, error?: string }> {
    try {
        const sessionData = await getUserSession();
        if (!sessionData) {
            return { success: false, error: "Unauthorized" };
        }

        // Extremely raw pull - generally discouraged for frontend usage but available if explicitly requested
        const user = await prisma.user.findUnique({
            where: { id: sessionData.user.id },
            include: {
                emails: true,
                addresses: true,
                preferences: true,
                notifications: true,
                password: true,
                two_factor_methods: true,
                sessions: true,
                oauth_accounts: true,
            }
        });

        if (!user) return { success: false, error: "User not found" };

        // Even in full profile, strip cryptographic hashes from being returned
        const fullProfile: FullProfile = {
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar: user.avatar,
                bio: user.bio,
                date_of_birth: user.date_of_birth,
                pronouns: user.pronouns,
                username_last_changed: user.username_last_changed,
                is_active: user.is_active,
                created_on: user.created_on,
                updated_on: user.updated_on
            },
            emails: user.emails,
            addresses: user.addresses,
            preferences: (user.preferences as unknown as DBUserPreference) || {
                user_id: user.id,
                theme: "system",
                language: "en",
                timezone: "UTC"
            },
            notifications: user.notifications || {
                user_id: user.id,
                email_security: true,
                email_marketing: false,
                login_alerts: true,
                product_updates: true
            },
            password: user.password ? {
                user_id: user.password.user_id,
                password_hash: "[REDACTED]", // Never expose password hashes
                last_changed_on: user.password.last_changed_on,
                force_change: user.password.force_change,
                failed_attempts: user.password.failed_attempts,
                locked_until: user.password.locked_until
            } : null,
            two_factor_methods: user.two_factor_methods.map(m => ({ ...m, type: m.type as import("@/types/auth.types").VerificationMethodType })),
            sessions: user.sessions.map(s => ({
                id: s.id,
                user_id: s.user_id,
                session_token_hash: "[REDACTED]",
                refresh_token_hash: "[REDACTED]",
                created_on: s.created_on,
                updated_on: s.updated_on,
                session_expires_on: s.session_expires_on,
                expires_on: s.expires_on,
                revoked_on: s.revoked_on,
                ip_address: s.ip_address,
                user_agent: s.user_agent,
                device_name: s.device_name
            })),
            oauth_accounts: user.oauth_accounts.map(acc => ({
                id: acc.id,
                user_id: acc.user_id,
                provider: acc.provider,
                provider_user_id: acc.provider_user_id,
                created_on: acc.created_on,
                access_token: "[REDACTED]",
                refresh_token: "[REDACTED]",
                expires_at: acc.expires_at
            }))
        };

        return { success: true, data: fullProfile };
    } catch (e: unknown) {
    const em = getErrorMessage(e);
        return { success: false, error: em };
    }
}

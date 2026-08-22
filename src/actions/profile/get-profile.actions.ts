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
import { handleError } from "@/utils/error";

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
        const em = handleError(e, "Failed to execute getMinimalProfile");
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
        const em = handleError(e, "Failed to execute getExtendedProfile");
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
                account_status: true,
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
                account_status: user.account_status,
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
        const em = handleError(e, "Failed to execute getSecuredFullProfile");
        return { success: false, error: em };
    }
}

export async function getFullProfile(): Promise<{ success: boolean, data?: FullProfile, error?: string }> {
    try {
        const sessionData = await getUserSession();
        if (!sessionData) {
            return { success: false, error: "Unauthorized" };
        }

        // Fetch only needed fields without sensitive hashes or tokens
        const user = await prisma.user.findUnique({
            where: { id: sessionData.user.id },
            select: {
                id: true,
                username: true,
                first_name: true,
                last_name: true,
                avatar: true,
                bio: true,
                date_of_birth: true,
                pronouns: true,
                username_last_changed: true,
                created_on: true,
                updated_on: true,
                account_status: true,
                emails: true,
                addresses: true,
                preferences: true,
                notifications: true,
                password: {
                    select: {
                        user_id: true,
                        last_changed_on: true,
                        force_change: true,
                        failed_attempts: true,
                        locked_until: true,
                    }
                },
                two_factor: {
                    select: {
                        totp: { select: { enabled: true } },
                        passkeys: {
                            select: {
                                id: true,
                                two_factor_id: true,
                                credential_id: true,
                                sign_count: true,
                                device_name: true,
                                created_on: true,
                                last_used_on: true,
                            }
                        }
                    }
                },
                recovery_codes: {
                    select: {
                        id: true,
                        used: true,
                        created_on: true,
                    }
                },
                sessions: {
                    select: {
                        id: true,
                        user_id: true,
                        created_on: true,
                        updated_on: true,
                        session_expires_on: true,
                        expires_on: true,
                        revoked_on: true,
                        ip_address: true,
                        user_agent: true,
                        device_name: true,
                    }
                },
                oauth_accounts: {
                    select: {
                        id: true,
                        user_id: true,
                        provider: true,
                        provider_user_id: true,
                        created_on: true,
                        expires_at: true,
                    }
                }
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
                account_status: user.account_status,
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
                password_hash: "[REDACTED]",
                last_changed_on: user.password.last_changed_on,
                force_change: user.password.force_change,
                failed_attempts: user.password.failed_attempts || 0,
                locked_until: user.password.locked_until || null
            } : null,
            passkeys: user.two_factor?.passkeys?.map((p) => ({
                ...p,
                public_key: "[REDACTED]",
                device_name: p.device_name ?? undefined,
                created_on: p.created_on.toISOString(),
                last_used_on: p.last_used_on ? p.last_used_on.toISOString() : undefined,
            })) ?? [],
            has_totp: !!user.two_factor?.totp?.enabled,
            recovery_codes: user.recovery_codes.map(c => ({ id: c.id, used: c.used, created_on: c.created_on.toISOString() })),
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
        const em = handleError(e, "Failed to execute getFullProfile");
        return { success: false, error: em };
    }
}

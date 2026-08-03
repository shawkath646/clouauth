import type { DBUser, DBAddress, DBUserEmail } from "./user.types";
import type { DBNotificationPreference, DBUserPreference } from "./preferences.types";
import type { DBPasswordCredential, DBTwoFactorMethod, DBOAuthAccount } from "./auth.types";
import type { DBUserSession } from "./session.types";

// 1. Full profile
export interface FullProfile {
    user: DBUser;
    emails: DBUserEmail[];
    addresses: DBAddress[];
    preferences: DBUserPreference;
    notifications: DBNotificationPreference;
    password: DBPasswordCredential | null;
    two_factor_methods: DBTwoFactorMethod[];
    sessions: DBUserSession[];
    oauth_accounts: DBOAuthAccount[];
}

// 2. Secured full profile // remove auth related data
export type SecuredFullProfile = Omit<FullProfile, 'password' | 'two_factor_methods' | 'sessions'>;

// 3. Minimal profile // return user basic info, like primary email, username, profile_pic, full name, dob etc
export interface MinimalProfile {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar: string;
    bio?: string | null;
    date_of_birth?: string;
    primary_email: string;
}

export interface ExtendedProfile extends MinimalProfile {
    addresses: DBAddress[];
    created_on: string;
    preferences: DBUserPreference;
    pronouns?: string | null;
    username_last_changed?: Date | null;
}
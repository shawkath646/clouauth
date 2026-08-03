export interface DBAuditLog {
    id: string;
    user_id: string;
    action:
        | "login"
        | "logout"
        | "password_changed"
        | "email_added"
        | "email_removed"
        | "2fa_enabled"
        | "2fa_disabled"
        | "passkey_added"
        | "passkey_removed";

    ip_address?: string;
    user_agent?: string;
    created_on: string;
}
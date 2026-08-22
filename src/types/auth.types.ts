export type VerificationMethodType = "totp" | "passkey" | "code" | "phone";

export interface VerificationMethod {
    id: string;
    type: VerificationMethodType;
    name?: string;
}

export interface DBPasswordCredential {
    user_id: string;
    password_hash: string;
    last_changed_on: Date;
    force_change: boolean;
    failed_attempts: number;
    locked_until?: Date | null;
}

export interface DBPasswordHistory {
    id: string;
    user_id: string;
    password_hash: string;
    created_on: string;
}

export interface DBRecoveryCode {
    id: string;
    user_id: string;
    code_hash: string;
    used: boolean;
    created_on: string;
    used_on?: string;
}



export interface DBTotpCredential {
    two_factor_id: string;
    secret: string;
    algorithm: "SHA1" | "SHA256" | "SHA512";
    digits: number;
    period: number;
}

export interface DBPasskeyCredential {
    id: string;
    two_factor_id: string;
    credential_id: string;
    public_key: string;
    sign_count: number;
    device_name?: string;
    created_on: string;
    last_used_on?: string;
}



export interface DBOAuthAccount {
    id: string;
    user_id: string;
    provider: string;
    provider_user_id: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number | null;
    created_on: Date;
}
export interface SessionData {
    sessionToken: string;
    refreshToken: string;
    sessionExpiresOn: Date;
    refreshExpiresOn: Date;
}

export interface DBUserSession {
    id: string;
    user_id: string;
    session_token_hash: string;
    refresh_token_hash: string;
    created_on: Date;
    updated_on: Date;
    session_expires_on: Date;
    expires_on: Date;
    revoked_on?: Date | null;
    ip_address?: string | null;
    user_agent?: string | null;
    device_name?: string | null;
}

export type SafeDBUserSession = Omit<DBUserSession, 'session_token_hash' | 'refresh_token_hash'>;

export interface DBTempSession {
    id: string;
    user_id: string;
    created_on: Date;
    expires_on: Date;
}
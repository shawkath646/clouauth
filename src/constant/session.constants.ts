// Session Token lives very short (15 minutes)
export const SESSION_TOKEN_TTL = 15 * 60; // in seconds

// Short-lived refresh session (24 hours) for Remember Me = false
export const REFRESH_TOKEN_TTL = 24 * 60 * 60; // in seconds

// Long-lived refresh session (30 days) for Remember Me = true
export const REFRESH_TOKEN_TTL_REMEMBER_ME = 30 * 24 * 60 * 60; // in seconds

export const COOKIE_SESSION_TOKEN_NAME = "session_token";
export const COOKIE_REFRESH_TOKEN_NAME = "refresh_token";

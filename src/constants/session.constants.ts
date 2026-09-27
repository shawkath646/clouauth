// Session Token lives 1 hour (3600 seconds)
export const SESSION_TOKEN_TTL = 60 * 60; // in seconds

// Sliding refresh session (7 days) for Remember Me = false
export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // in seconds

// Extended refresh session (30 days) for Remember Me = true
export const REFRESH_TOKEN_TTL_REMEMBER_ME = 30 * 24 * 60 * 60; // in seconds

export const COOKIE_SESSION_TOKEN_NAME = "session_token";
export const COOKIE_REFRESH_TOKEN_NAME = "refresh_token";

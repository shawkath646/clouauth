export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // UNIX timestamp in seconds
}

export interface OAuthUserProfile {
  id: string; // The provider's unique ID for the user
  email?: string;
  name?: string;
  avatar?: string;
}

export interface IOAuthProvider {
  /**
   * Returns the authorization URL to redirect the user to.
   * @param state A random string to prevent CSRF.
   */
  getAuthorizationUrl(state: string): string;

  /**
   * Exchanges the authorization code for access/refresh tokens.
   */
  exchangeCode(code: string): Promise<OAuthTokens>;

  /**
   * Fetches the user profile from the provider using the access token.
   */
  getUserProfile(accessToken: string): Promise<OAuthUserProfile>;
}

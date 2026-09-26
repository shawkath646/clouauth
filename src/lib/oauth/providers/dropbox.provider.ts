import { getEnv } from "@/utils/env";
import { IOAuthProvider, OAuthTokens, OAuthUserProfile } from "../types";

export class DropboxOAuthProvider implements IOAuthProvider {
  private clientId = getEnv("DROPBOX_CLIENT_ID", true);
  private clientSecret = getEnv("DROPBOX_CLIENT_SECRET", true);
  private redirectUri = `${getEnv("NEXT_PUBLIC_BASE_URL", true) || "http://localhost:3000"}/api/oauth/callback/dropbox`;

  getAuthorizationUrl(state: string): string {
    if (!this.clientId) {
      throw new Error("Dropbox integration is not configured. Please set DROPBOX_CLIENT_ID and DROPBOX_CLIENT_SECRET in your environment.");
    }
    const url = new URL("https://www.dropbox.com/oauth2/authorize");
    url.searchParams.append("client_id", this.clientId);
    url.searchParams.append("redirect_uri", this.redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("state", state);
    url.searchParams.append("token_access_type", "offline");
    return url.toString();
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Dropbox integration is not configured.");
    }
    const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to exchange code with Dropbox: ${errorData}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile from Dropbox");
    }

    const data = await response.json();
    return {
      id: data.account_id,
      email: data.email,
      name: data.name?.display_name || "Dropbox User",
      avatar: data.profile_photo_url,
    };
  }
}

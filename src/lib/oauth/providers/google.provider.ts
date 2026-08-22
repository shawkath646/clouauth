import { getEnv } from "@/utils/env";
import { IOAuthProvider, OAuthTokens, OAuthUserProfile } from "../types";

export class GoogleOAuthProvider implements IOAuthProvider {
  private clientId = getEnv("GOOGLE_CLIENT_ID");
  private clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  private redirectUri = `${getEnv("NEXT_PUBLIC_BASE_URL")}/api/oauth/callback/google`;

  getAuthorizationUrl(state: string): string {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.append("client_id", this.clientId);
    url.searchParams.append("redirect_uri", this.redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "openid email profile");
    url.searchParams.append("state", state);
    url.searchParams.append("access_type", "offline");
    url.searchParams.append("prompt", "consent");
    return url.toString();
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
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
      throw new Error(`Failed to exchange code: ${errorData}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile from Google");
    }

    const data = await response.json();
    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      avatar: data.picture,
    };
  }
}

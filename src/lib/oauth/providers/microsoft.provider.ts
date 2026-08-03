import { IOAuthProvider, OAuthTokens, OAuthUserProfile } from "../types";

export class MicrosoftOAuthProvider implements IOAuthProvider {
  private clientId = process.env.MICROSOFT_CLIENT_ID || "";
  private clientSecret = process.env.MICROSOFT_CLIENT_SECRET || "";
  private redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/oauth/callback/microsoft`;
  private tenantId = process.env.MICROSOFT_TENANT_ID || "common";

  getAuthorizationUrl(state: string): string {
    const url = new URL(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`);
    url.searchParams.append("client_id", this.clientId);
    url.searchParams.append("redirect_uri", this.redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "openid profile email offline_access");
    url.searchParams.append("state", state);
    url.searchParams.append("response_mode", "query");
    return url.toString();
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
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
      throw new Error(`Failed to exchange code with Microsoft: ${errorData}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile from Microsoft");
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      avatar: undefined, // Microsoft Graph API requires a separate call to /me/photo/$value
    };
  }
}

import { IOAuthProvider, OAuthTokens, OAuthUserProfile } from "../types";

export class GithubOAuthProvider implements IOAuthProvider {
  private clientId = process.env.GITHUB_CLIENT_ID || "";
  private clientSecret = process.env.GITHUB_CLIENT_SECRET || "";
  private redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/oauth/callback/github`;

  getAuthorizationUrl(state: string): string {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.append("client_id", this.clientId);
    url.searchParams.append("redirect_uri", this.redirectUri);
    url.searchParams.append("scope", "read:user user:email");
    url.searchParams.append("state", state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code with GitHub");
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`GitHub error: ${data.error_description}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile from GitHub");
    }

    const data = await response.json();

    let email = data.email;
    if (!email) {
      try {
        const emailsResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        const emailsData = await emailsResponse.json();
        const primaryEmail = emailsData.find((e: unknown) => e.primary);
        if (primaryEmail) email = primaryEmail.email;
      } catch {}
    }

    return {
      id: data.id.toString(),
      email,
      name: data.name || data.login,
      avatar: data.avatar_url,
    };
  }
}

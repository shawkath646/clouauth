import { getEnv } from "@/utils/env";
import { IOAuthProvider, OAuthTokens, OAuthUserProfile } from "../types";

export class MicrosoftOAuthProvider implements IOAuthProvider {
  private clientId = getEnv("MICROSOFT_CLIENT_ID");
  private clientSecret = getEnv("MICROSOFT_CLIENT_SECRET");
  private tenantId = getEnv("MICROSOFT_TENANT_ID", true) || "common";
  private isDrive: boolean;
  private redirectUri: string;

  constructor(isDrive: boolean = false) {
    this.isDrive = isDrive;
    const base = getEnv("NEXT_PUBLIC_BASE_URL", true) || "http://localhost:3000";
    const driveRedirect = getEnv("ONEDRIVE_REDIRECT_URI", true);
    this.redirectUri = this.isDrive && driveRedirect ? driveRedirect : `${base}/api/oauth/callback/microsoft`;
  }

  getAuthorizationUrl(state: string): string {
    const url = new URL(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`);
    url.searchParams.append("client_id", this.clientId);
    url.searchParams.append("redirect_uri", this.redirectUri);
    url.searchParams.append("response_type", "code");

    const scope = this.isDrive
      ? "openid profile email User.Read offline_access Files.Read Files.ReadWrite"
      : "openid profile email User.Read offline_access";

    url.searchParams.append("scope", scope);
    url.searchParams.append("state", state);
    url.searchParams.append("response_mode", "query");
    url.searchParams.append("prompt", "select_account");
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
    const profileResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,otherMails",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch user profile from Microsoft");
    }

    const data = await profileResponse.json();
    let email: string | undefined = data.mail;

    // 1. If mail is null, check otherMails (common for B2B guest accounts)
    if (!email && Array.isArray(data.otherMails) && data.otherMails.length > 0) {
      const validOther = data.otherMails.find(
        (m: unknown) => typeof m === "string" && m.includes("@") && !m.toLowerCase().includes("#ext#")
      );
      if (validOther) email = validOther;
    }

    // 2. If still null, inspect userPrincipalName (e.g. username_gmail.com#EXT#@tenant.onmicrosoft.com)
    if (!email && data.userPrincipalName) {
      const upn = data.userPrincipalName;
      if (upn.toLowerCase().includes("#ext#")) {
        const prefix = upn.split(/#ext#/i)[0];
        const lastUnderscoreIndex = prefix.lastIndexOf("_");
        if (lastUnderscoreIndex !== -1) {
          email = prefix.substring(0, lastUnderscoreIndex) + "@" + prefix.substring(lastUnderscoreIndex + 1);
        } else {
          email = prefix;
        }
      } else if (upn.includes("@")) {
        email = upn;
      }
    }

    let avatar: string | undefined = undefined;

    // 3. Fetch profile photo: try v1.0 first, then fallback to beta
    try {
      let photoResponse = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (photoResponse.status === 404) {
        photoResponse = await fetch("https://graph.microsoft.com/beta/me/photo/$value", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }

      if (photoResponse.ok) {
        const arrayBuffer = await photoResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > 0) {
          const contentType = photoResponse.headers.get("content-type") || "image/jpeg";
          avatar = `data:${contentType};base64,${buffer.toString("base64")}`;
        }
      }
    } catch {
      // Non-blocking fallback
    }

    const isEmailVerified = Boolean(
      data.mail ||
      (email && !email.toLowerCase().includes("#ext#") && !email.toLowerCase().endsWith(".onmicrosoft.com"))
    );

    return {
      id: data.id,
      email,
      emailVerified: isEmailVerified,
      name: data.displayName,
      avatar,
    };
  }
}

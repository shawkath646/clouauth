import prisma from "@/lib/prisma";
import { encryptSymmetric } from "@/lib/encryption";
import { getEnv } from "@/utils/env";

export interface RefreshedTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export async function refreshDriveAccountToken(
  accountId: string,
  provider: string,
  decryptedRefreshToken: string
): Promise<RefreshedTokenResult | null> {
  const normProvider = provider.toLowerCase();

  try {
    if (normProvider === "google" || normProvider === "google_drive") {
      const clientId = getEnv("GOOGLE_CLIENT_ID", true);
      const clientSecret = getEnv("GOOGLE_CLIENT_SECRET", true);
      if (!clientId || !clientSecret) return null;

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: decryptedRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const expiresAt = data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : undefined;

      await prisma.oAuthAccount.update({
        where: { id: accountId },
        data: {
          access_token: encryptSymmetric(data.access_token),
          expires_at: expiresAt,
        },
      });

      return {
        accessToken: data.access_token,
        refreshToken: decryptedRefreshToken,
        expiresAt,
      };
    }

    if (normProvider === "microsoft" || normProvider === "onedrive") {
      const clientId = getEnv("MICROSOFT_CLIENT_ID", true);
      const clientSecret = getEnv("MICROSOFT_CLIENT_SECRET", true);
      if (!clientId || !clientSecret) return null;

      const res = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: decryptedRefreshToken,
            grant_type: "refresh_token",
          }),
        }
      );

      if (!res.ok) return null;
      const data = await res.json();
      const expiresAt = data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : undefined;

      const newRefreshToken = data.refresh_token || decryptedRefreshToken;

      await prisma.oAuthAccount.update({
        where: { id: accountId },
        data: {
          access_token: encryptSymmetric(data.access_token),
          refresh_token: encryptSymmetric(newRefreshToken),
          expires_at: expiresAt,
        },
      });

      return {
        accessToken: data.access_token,
        refreshToken: newRefreshToken,
        expiresAt,
      };
    }

    if (normProvider === "dropbox") {
      const clientId = getEnv("DROPBOX_CLIENT_ID", true);
      const clientSecret = getEnv("DROPBOX_CLIENT_SECRET", true);
      if (!clientId || !clientSecret) return null;

      const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: decryptedRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const expiresAt = data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : undefined;

      await prisma.oAuthAccount.update({
        where: { id: accountId },
        data: {
          access_token: encryptSymmetric(data.access_token),
          expires_at: expiresAt,
        },
      });

      return {
        accessToken: data.access_token,
        refreshToken: decryptedRefreshToken,
        expiresAt,
      };
    }
  } catch {
    return null;
  }

  return null;
}

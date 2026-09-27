import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export interface RecordActivityOptions {
  userId: string;
  event:
    | "LOGIN_PASSWORD"
    | "LOGIN_OAUTH"
    | "LOGIN_GOOGLE_ONE_TAP"
    | "LOGIN_PASSKEY"
    | "LOGIN_2FA"
    | "PASSWORD_CHANGED"
    | "PASSWORD_SET"
    | "PASSKEY_ADDED"
    | "PASSKEY_REMOVED"
    | "TOTP_ENABLED"
    | "TOTP_DISABLED"
    | "RECOVERY_CODES_GENERATED"
    | "RECOVERY_EMAIL_VERIFIED"
    | "ACCOUNT_DISABLED"
    | "ACCOUNT_REENABLED"
    | "SESSION_REVOKED"
    | "ALL_SESSIONS_REVOKED"
    | "OAUTH_CONNECTED"
    | "OAUTH_DISCONNECTED"
    | "SUDO_VERIFIED"
    | string;
  title: string;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  device?: string | null;
  city?: string | null;
  country?: string | null;
  status?: "success" | "warning" | "failure";
}

export function parseDeviceFromUserAgent(ua: string | null | undefined): {
  deviceName: string;
  browserName: string;
  label: string;
} {
  if (!ua) {
    return { deviceName: "Unknown Device", browserName: "Unknown Browser", label: "Unknown Device" };
  }

  let deviceName = "PC";
  let browserName = "Browser";

  if (ua.includes("Windows NT 10.0") || ua.includes("Windows")) deviceName = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) deviceName = "macOS";
  else if (ua.includes("iPhone")) deviceName = "iPhone";
  else if (ua.includes("iPad")) deviceName = "iPad";
  else if (ua.includes("Android")) deviceName = "Android";
  else if (ua.includes("Linux")) deviceName = "Linux";

  if (ua.includes("Edg/")) browserName = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browserName = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browserName = "Chrome";
  else if (ua.includes("Firefox/")) browserName = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browserName = "Safari";

  return {
    deviceName,
    browserName,
    label: `${deviceName} • ${browserName}`,
  };
}

export async function recordSecurityActivity(options: RecordActivityOptions): Promise<void> {
  try {
    let { ipAddress, userAgent, device, city, country } = options;

    if (!ipAddress || !userAgent) {
      try {
        const headerList = await headers();
        if (!ipAddress) {
          const forwarded = headerList.get("x-forwarded-for");
          ipAddress = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip");
        }
        if (!userAgent) {
          userAgent = headerList.get("user-agent");
        }
        if (!city) {
          city = headerList.get("x-vercel-ip-city") || headerList.get("cf-ipcity") || null;
        }
        if (!country) {
          country = headerList.get("x-vercel-ip-country") || headerList.get("cf-ipcountry") || null;
        }
      } catch {
        // Headers might not be available in background context
      }
    }

    if (!device) {
      const parsed = parseDeviceFromUserAgent(userAgent);
      device = parsed.label;
    }

    await prisma.securityActivity.create({
      data: {
        user_id: options.userId,
        event: options.event,
        title: options.title,
        description: options.description || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        device: device || null,
        city: city || null,
        country: country || null,
        status: options.status || "success",
      },
    });
  } catch (err) {
    // Non-blocking: Logging failure should never interrupt user auth flows
    console.error("[SecurityActivity] Failed to record security activity:", err);
  }
}

export async function getUserSecurityActivities(userId: string, limit = 20) {
  try {
    return await prisma.securityActivity.findMany({
      where: { user_id: userId },
      orderBy: { created_on: "desc" },
      take: limit,
    });
  } catch (err) {
    console.error("[SecurityActivity] Failed to fetch security activities:", err);
    return [];
  }
}

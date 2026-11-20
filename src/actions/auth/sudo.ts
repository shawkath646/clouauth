import "server-only";

import {
  getUserSession,
  createTempSession,
  updateSession,
} from "@/lib/session";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getSafeReturnTo } from "@/utils/url";

// 15-minute Sudo grace window
const SUDO_GRACE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Checks whether the current user's session has been authenticated within the grace window.
 */
export async function isSudoActive(): Promise<boolean> {
  const sessionData = await getUserSession();
  if (!sessionData?.session) return false;

  const lastAuth = sessionData.session.last_authenticated_on;
  if (!lastAuth) return false;

  const elapsed = Date.now() - new Date(lastAuth).getTime();
  return elapsed < SUDO_GRACE_WINDOW_MS;
}

/**
 * Creates or refreshes a Sudo TempSession for step-up verification using a 256-bit random token ID.
 */
export async function createSudoTempSession(
  userId: string,
  returnTo: string = "/profile"
): Promise<string> {
  const tempSession = await createTempSession(userId, {
    flowType: "sudo",
    expiresOn: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes TTL
    payload: JSON.stringify({ return_to: getSafeReturnTo(returnTo, "en") }),
  });

  return tempSession.id;
}

/**
 * Updates the active UserSession's last_authenticated_on timestamp,
 * granting a fresh Sudo window.
 */
export async function markSessionSudoAuthenticated(
  sessionId: string
): Promise<void> {
  await updateSession(sessionId, {
    last_authenticated_on: new Date(),
  });
}

/**
 * Page Guard for sensitive Server Component routes (e.g. /profile/password).
 * If the user's re-authentication is expired, redirects directly to /signin?tid=...&return_to=...
 */
export async function requireSudoPage(returnTo: string, locale?: string) {
  const sessionData = await getUserSession();
  const segments = returnTo.split("/").filter(Boolean);
  const langPrefix = locale ? `/${locale}` : (segments[0] && ['en', 'bn', 'ko', 'es', 'ar', 'zh'].includes(segments[0])) ? `/${segments[0]}` : "";
  const signInPath = `${langPrefix}/signin`;

  if (!sessionData?.session) {
    redirect(`${signInPath}?return_to=${encodeURIComponent(returnTo)}` as Route);
  }

  const active = await isSudoActive();
  if (!active) {
    const tid = await createSudoTempSession(sessionData.user.id, returnTo);
    redirect(`${signInPath}?tid=${tid}&return_to=${encodeURIComponent(returnTo)}` as Route);
  }

  return sessionData;
}

export type CheckSudoResult =
  | {
      authorized: true;
      sessionData: NonNullable<Awaited<ReturnType<typeof getUserSession>>>;
      error?: never;
      sudoRequired?: never;
      redirectUrl?: never;
    }
  | {
      authorized: false;
      sessionData?: never;
      error: string;
      sudoRequired: boolean;
      redirectUrl: string;
    };

/**
 * Action Guard for sensitive Server Actions (e.g. changing password, disabling account).
 */
export async function checkSudoAction(
  returnTo: string = "/profile"
): Promise<CheckSudoResult> {
  const sessionData = await getUserSession();
  if (!sessionData?.session) {
    return {
      authorized: false,
      error: "Authentication required",
      sudoRequired: false,
      redirectUrl: `/signin?return_to=${encodeURIComponent(returnTo)}`,
    };
  }

  const active = await isSudoActive();
  if (!active) {
    const tid = await createSudoTempSession(sessionData.user.id, returnTo);
    return {
      authorized: false,
      error: "Sudo re-authentication required",
      sudoRequired: true,
      redirectUrl: `/signin?tid=${tid}&return_to=${encodeURIComponent(returnTo)}`,
    };
  }

  return {
    authorized: true,
    sessionData,
  };
}

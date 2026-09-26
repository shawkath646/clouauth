"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { redirect } from "next/navigation";

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
 * Creates or refreshes a Sudo TempSession for step-up verification.
 */
export async function createSudoTempSession(
  userId: string,
  returnTo: string = "/profile"
): Promise<string> {
  // Clean up any stale sudo temp sessions for this user
  await prisma.tempSession.deleteMany({
    where: {
      user_id: userId,
      flow_type: "sudo",
    },
  });

  const tempSession = await prisma.tempSession.create({
    data: {
      user_id: userId,
      flow_type: "sudo",
      expires_on: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes TTL
      payload: JSON.stringify({ return_to: returnTo }),
    },
  });

  return tempSession.id;
}

/**
 * Updates the active UserSession's last_authenticated_on timestamp,
 * granting a fresh Sudo window.
 */
export async function markSessionSudoAuthenticated(sessionId: string): Promise<void> {
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { last_authenticated_on: new Date() },
  });
}

/**
 * Page Guard for sensitive Server Component routes (e.g. /profile/password).
 * If the user's re-authentication is expired, redirects directly to /signin?tid=...&return_to=...
 */
export async function requireSudoPage(returnTo: string) {
  const sessionData = await getUserSession();
  if (!sessionData?.session) {
    redirect(`/signin?return_to=${encodeURIComponent(returnTo)}`);
  }

  const active = await isSudoActive();
  if (!active) {
    const tid = await createSudoTempSession(sessionData.user.id, returnTo);
    redirect(`/signin?tid=${tid}&return_to=${encodeURIComponent(returnTo)}`);
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
      sudoRequired?: boolean;
      redirectUrl?: string;
    };

/**
 * Action Guard for sensitive Server Action mutations (e.g. updatePasswordAction, deleteAccount).
 * Returns { authorized: false, sudoRequired: true, redirectUrl } if expired.
 */
export async function checkSudoAction(returnTo: string): Promise<CheckSudoResult> {
  const sessionData = await getUserSession();
  if (!sessionData?.session) {
    return { authorized: false, error: "Unauthorized" };
  }

  const active = await isSudoActive();
  if (!active) {
    const tid = await createSudoTempSession(sessionData.user.id, returnTo);
    return {
      authorized: false,
      sudoRequired: true,
      redirectUrl: `/signin?tid=${tid}&return_to=${encodeURIComponent(returnTo)}`,
      error: "Re-authentication required. Please confirm your identity.",
    };
  }

  return { authorized: true, sessionData };
}

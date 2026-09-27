"use server";

import prisma from "@/lib/prisma";
import { handleError } from "@/utils/error";
import { cookies, headers } from "next/headers";
import { signOutAll } from "@/actions/auth/auth";
import { COOKIE_SESSION_TOKEN_NAME, COOKIE_REFRESH_TOKEN_NAME } from "@/constants/session.constants";
import { requireUserSession } from "@/actions/auth/helpers";
import { checkSudoAction } from "@/actions/auth/sudo";
import { recordSecurityActivity } from "@/lib/security-activity";

export interface DeleteAccountInput {
  reason?: string;
}

export async function disableAccount() {
  try {
    const sudoCheck = await checkSudoAction("/profile/danger");
    if (!sudoCheck.authorized) {
      return { success: false, error: sudoCheck.error, sudoRequired: true, redirectUrl: sudoCheck.redirectUrl };
    }

    const sessionData = await requireUserSession();
    const userId = sessionData.user.id;

    // Update account status
    await prisma.accountStatus.upsert({
      where: { user_id: userId },
      update: {
        is_active: false,
        self_enable: true,
        reason: "User disabled account via settings",
      },
      create: {
        user_id: userId,
        is_active: false,
        self_enable: true,
        reason: "User disabled account via settings",
      },
    });

    await recordSecurityActivity({
      userId,
      event: "ACCOUNT_DISABLED",
      title: "Account temporarily disabled",
      description: "Account was deactivated by the user via security settings",
    });

    // Delete all sessions for the user
    await signOutAll(userId);

    // Clear local cookies
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_SESSION_TOKEN_NAME);
    cookieStore.delete(COOKIE_REFRESH_TOKEN_NAME);

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

export async function deleteAccount(input: DeleteAccountInput = {}) {
  try {
    const sudoCheck = await checkSudoAction("/profile/danger");
    if (!sudoCheck.authorized) {
      return { success: false, error: sudoCheck.error, sudoRequired: true, redirectUrl: sudoCheck.redirectUrl };
    }

    const sessionData = await requireUserSession();
    const userId = sessionData.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        emails: { where: { is_primary: true } },
        phones: { where: { is_primary: true } },
      },
    });

    if (!user) {
      return { success: false, error: "User not found." };
    }

    // Capture request audit metadata
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || null;
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;

    // Transactional archival to Graveyard and full cascade deletion of sensitive data
    await prisma.$transaction(async (tx) => {
      // 1. Archive essential audit info into Graveyard
      await tx.graveyard.create({
        data: {
          user_id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.emails[0]?.address || null,
          phone: user.phones[0]?.number || null,
          deletion_reason: input.reason || "User requested deletion via profile settings",
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      // 2. Explicitly remove TwoFactor and active sessions
      await tx.twoFactor.deleteMany({ where: { user_id: user.id } });
      await tx.userSession.deleteMany({ where: { user_id: user.id } });
      await tx.tempSession.deleteMany({ where: { user_id: user.id } });

      // 3. Delete user record (cascades emails, phones, addresses, passwords, apps, preferences)
      await tx.user.delete({ where: { id: user.id } });
    });

    // Clear local auth cookies
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_SESSION_TOKEN_NAME);
    cookieStore.delete(COOKIE_REFRESH_TOKEN_NAME);
    cookieStore.delete("theme_pref");

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

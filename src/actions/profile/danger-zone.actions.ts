"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { cookies } from "next/headers";
import { signOutAll } from "@/actions/auth/auth.actions";
import { COOKIE_SESSION_TOKEN_NAME, COOKIE_REFRESH_TOKEN_NAME } from "@/constants/session.constants";

export async function disableAccount() {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const userId = sessionData.user.id;

    // Update account status
    await prisma.accountStatus.upsert({
      where: { user_id: userId },
      update: {
        is_active: false,
        self_enable: true,
        reason: "User disabled account via settings"
      },
      create: {
        user_id: userId,
        is_active: false,
        self_enable: true,
        reason: "User disabled account via settings"
      }
    });

    // Delete all sessions for the user
    await signOutAll(userId);

    // Clear local cookie
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_SESSION_TOKEN_NAME);
    cookieStore.delete(COOKIE_REFRESH_TOKEN_NAME);

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to execute disableAccount") };
  }
}

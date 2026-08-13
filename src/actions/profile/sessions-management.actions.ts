"use server";

import prisma from "@/lib/prisma";
import { getUserSession, revokeSession, signOut } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { handleError } from "@/utils/utils";

export async function revokeUserSessionAction(sessionId: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const targetSession = await prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!targetSession || targetSession.user_id !== sessionData.user.id) {
      return { success: false, error: "Session not found or unauthorized" };
    }

    const isCurrent = sessionId === sessionData.session.id;

    if (isCurrent) {
      await signOut(sessionId);
    } else {
      await revokeSession(sessionId);
    }

    revalidatePath("/profile");
    return { success: true, isCurrent };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute revokeUserSessionAction");
    return { success: false, error: em };
  }
}

export async function revokeAllUserSessionsAction(includeCurrent: boolean = false) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    if (includeCurrent) {
      await prisma.userSession.updateMany({
        where: {
          user_id: sessionData.user.id,
          revoked_on: null,
        },
        data: {
          revoked_on: new Date(),
        },
      });
      await signOut();
      return { success: true, isCurrent: true };
    } else {
      await prisma.userSession.updateMany({
        where: {
          user_id: sessionData.user.id,
          revoked_on: null,
          id: { not: sessionData.session.id },
        },
        data: {
          revoked_on: new Date(),
        },
      });
      revalidatePath("/profile");
      return { success: true, isCurrent: false };
    }
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute revokeAllUserSessionsAction");
    return { success: false, error: em };
  }
}

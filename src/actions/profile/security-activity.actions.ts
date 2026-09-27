"use server";

import { requireUserSession } from "@/actions/auth/helpers";
import { getUserSecurityActivities } from "@/lib/security-activity";
import { handleError } from "@/utils/error";

export async function getRecentSecurityActivitiesAction(limit = 50) {
  try {
    const session = await requireUserSession();
    const rawActivities = await getUserSecurityActivities(session.user.id, limit);
    const activities = rawActivities.map((act) => ({
      ...act,
      created_on: act.created_on instanceof Date ? act.created_on.toISOString() : String(act.created_on),
    }));
    return { success: true, activities };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true), activities: [] };
  }
}

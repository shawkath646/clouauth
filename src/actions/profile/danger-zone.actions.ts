"use server";

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import { getUser, getUserEmails, getUserPhones, updateUserAccountStatus } from "@/lib/users";
import { revokeAllUserSessions } from "@/lib/session";
import { handleError } from "@/utils/error";
import { cookies, headers } from "next/headers";
import { signOutAll } from "@/actions/auth/auth";
import { COOKIE_SESSION_TOKEN_NAME, COOKIE_REFRESH_TOKEN_NAME } from "@/constants/session.constants";
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

    const userId = sudoCheck.sessionData.user.id;

    // Update account status
    await updateUserAccountStatus(userId, {
      is_active: false,
      self_enable: true,
      reason: "User disabled account via settings",
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

    const userId = sudoCheck.sessionData.user.id;

    const [user, emails, phones] = await Promise.all([
      getUser(userId),
      getUserEmails(userId),
      getUserPhones(userId),
    ]);

    if (!user) {
      return { success: false, error: "User not found." };
    }

    // Capture request audit metadata
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || null;
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;

    const primaryEmail = emails.find((e) => e.is_primary)?.address || emails[0]?.address || null;
    const primaryPhone = phones.find((p) => p.is_primary)?.number || phones[0]?.number || null;

    // 1. Archive essential audit info into Graveyard directly
    await db.collection("graveyard").add({
      user_id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: primaryEmail,
      phone: primaryPhone,
      deletion_reason: input.reason || "User requested deletion via profile settings",
      ip_address: ipAddress,
      user_agent: userAgent,
      deleted_on: FieldValue.serverTimestamp(),
    });

    // 2. Clear reserved username and emails
    const batch = db.batch();
    batch.delete(db.collection("usernames").doc(user.username.toLowerCase().trim()));
    for (const email of emails) {
      batch.delete(db.collection("user_emails").doc(email.address.toLowerCase().trim()));
    }
    await batch.commit();

    // 3. Remove sessions
    await revokeAllUserSessions(userId);

    // 4. Recursive delete user document & all subcollections
    await db.recursiveDelete(db.collection("users").doc(user.id));

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

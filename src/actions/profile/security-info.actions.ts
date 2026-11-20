"use server";

import { db } from "@/lib/firebase";
import {
  getUserEmails,
  deleteUserEmail,
  addUserEmail,
  verifyUserEmail,
} from "@/lib/users";
import {
  getPasswordCredential,
  setPasswordCredential,
  deleteTotpMethod,
  replaceRecoveryCodes,
} from "@/lib/credentials";
import {
  getUserSession,
  getUserSessions,
  revokeSession,
  createTempSession,
  updateTempSession,
  deleteTempSession,
} from "@/lib/session";
import { revalidatePath } from "next/cache";
import { verifyPassword, hashPassword, hashCode, verifyCode } from "@/lib/security/hash";
import crypto from "crypto";
import { handleError } from "@/utils/error";
import { getDictionary } from "@/lib/i18n/server";
import { defaultLocale } from "@/lib/i18n/config";
import { sendEmail } from "@/lib/email";
import { checkSudoAction } from "@/actions/auth/sudo";
import { checkLockout, handleFailedAttempt } from "@/actions/auth/helpers";
import { recordSecurityActivity } from "@/lib/security-activity";

import {
  getPasswordSchema,
  getEmailSchema,
  getPhoneSchema,
  PasswordValues,
  EmailValues,
  PhoneValues,
} from "@/schema/security.schema";

export async function updatePasswordAction(data: PasswordValues) {
  try {
    const sudoCheck = await checkSudoAction("/profile/password");
    if (!sudoCheck.authorized) {
      return { success: false, error: sudoCheck.error, sudoRequired: true, redirectUrl: sudoCheck.redirectUrl };
    }

    const sessionData = sudoCheck.sessionData;

    const dict = await getDictionary("schema_security", defaultLocale);
    const passwordSchema = getPasswordSchema(dict);

    const parsed = passwordSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await getPasswordCredential(sessionData.user.id);

    if (existing) {
      if (!parsed.data.currentPassword) {
        return { success: false, error: "Current password is required to set a new password." };
      }
      const isMatch = await verifyPassword(parsed.data.currentPassword, existing.password_hash);
      if (!isMatch) {
        return { success: false, error: "Incorrect current password." };
      }
    }

    const newHash = await hashPassword(parsed.data.newPassword);

    await setPasswordCredential(sessionData.user.id, newHash);

    // Revoke all other active sessions upon password change
    const userSessions = await getUserSessions(sessionData.user.id);
    for (const s of userSessions) {
      if (s.id !== sessionData.session.id) {
        await revokeSession(s.id);
      }
    }

    await recordSecurityActivity({
      userId: sessionData.user.id,
      event: existing ? "PASSWORD_CHANGED" : "PASSWORD_SET",
      title: existing ? "Password changed" : "Password created",
      description: existing
        ? "Account password was updated successfully"
        : "A new password was set for this account",
    });

    revalidatePath("/profile");
    revalidatePath("/profile/password");
    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function updateRecoveryEmailAction(data: EmailValues) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const dict = await getDictionary("schema_security", defaultLocale);
    const emailSchema = getEmailSchema(dict);

    const parsed = emailSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const emails = await getUserEmails(sessionData.user.id);
    const existingRecovery = emails.find((e) => !e.is_primary);

    if (existingRecovery) {
      await deleteUserEmail(sessionData.user.id, existingRecovery.id);
    }

    await addUserEmail(sessionData.user.id, parsed.data.email.toLowerCase(), false);

    revalidatePath("/profile");
    revalidatePath("/profile/recovery-email");
    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute updateRecoveryEmailAction");
    return { success: false, error: em };
  }
}

export async function addPhoneMethodAction(data: PhoneValues) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const dict = await getDictionary("schema_security", defaultLocale);
    const phoneSchema = getPhoneSchema(dict);

    const parsed = phoneSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    return { success: false, error: "Not implemented" };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute addPhoneMethodAction");
    return { success: false, error: em };
  }
}

export async function removeTwoFactorMethodAction(methodId: string) {
  try {
    const sudoCheck = await checkSudoAction("/profile/authenticator");
    if (!sudoCheck.authorized) {
      return { success: false, error: sudoCheck.error, sudoRequired: true, redirectUrl: sudoCheck.redirectUrl };
    }

    const sessionData = sudoCheck.sessionData;

    if (methodId === "totp") {
      await deleteTotpMethod(sessionData.user.id);

      await recordSecurityActivity({
        userId: sessionData.user.id,
        event: "TOTP_DISABLED",
        title: "Authenticator app removed",
        description: "TOTP two-step verification was disabled",
      });
      revalidatePath("/profile");
      revalidatePath("/profile/authenticator");
      return { success: true };
    }

    return { success: false, error: "Invalid method" };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to remove method") };
  }
}

export async function generateBackupCodesAction(): Promise<{ success: boolean; codes?: string[]; error?: string; sudoRequired?: boolean; redirectUrl?: string }> {
  try {
    const sudoCheck = await checkSudoAction("/profile/backup-codes");
    if (!sudoCheck.authorized) {
      return { success: false, error: sudoCheck.error, sudoRequired: true, redirectUrl: sudoCheck.redirectUrl };
    }

    const sessionData = sudoCheck.sessionData;

    const codes: string[] = [];
    const hashPromises: Promise<string>[] = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
      codes.push(formatted);
      hashPromises.push(hashCode(formatted));
    }

    const hashedCodes = await Promise.all(hashPromises);

    await replaceRecoveryCodes(sessionData.user.id, hashedCodes);

    await recordSecurityActivity({
      userId: sessionData.user.id,
      event: "RECOVERY_CODES_GENERATED",
      title: "Backup codes regenerated",
      description: "Generated 10 new recovery backup codes",
    });

    revalidatePath("/profile");
    revalidatePath("/profile/backup-codes");
    return { success: true, codes };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute generateBackupCodesAction");
    return { success: false, error: em };
  }
}

export async function sendRecoveryEmailVerificationCodeAction(emailAddress: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const rawCode = Array.from({ length: 6 }, () => crypto.randomInt(0, 10)).join("");
    const codeHash = await hashCode(rawCode);

    const snap = await db
      .collection("temp_sessions")
      .where("user_id", "==", sessionData.user.id)
      .where("type", "==", "change_email")
      .orderBy("created_on", "desc")
      .limit(1)
      .get();

    if (!snap.empty) {
      await updateTempSession(snap.docs[0].id, {
        destination: emailAddress,
        code_hash: codeHash,
        expires_on: new Date(Date.now() + 10 * 60 * 1000),
        failed_attempts: 0,
        locked_until: null,
      });
    } else {
      await createTempSession(sessionData.user.id, {
        type: "change_email",
        destination: emailAddress,
        code_hash: codeHash,
        expires_on: new Date(Date.now() + 10 * 60 * 1000),
        failed_attempts: 0,
      });
    }

    await sendEmail("verification_code", {
      data: { code: rawCode },
      userId: sessionData.user.id,
    });

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to send code") };
  }
}

export async function verifyRecoveryEmailAction(code: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const snap = await db
      .collection("temp_sessions")
      .where("user_id", "==", sessionData.user.id)
      .where("type", "==", "change_email")
      .orderBy("created_on", "desc")
      .limit(1)
      .get();

    if (snap.empty) {
      return { success: false, error: "Code expired or not found" };
    }

    const tempSessionDoc = snap.docs[0];
    const tempSession = tempSessionDoc.data();

    if (new Date(tempSession.expires_on.toDate()) < new Date() || !tempSession.code_hash) {
      return { success: false, error: "Code expired or not found" };
    }

    const lockoutError = checkLockout(tempSession.locked_until ? tempSession.locked_until.toDate() : null);
    if (lockoutError) {
      return { success: false, error: lockoutError };
    }

    const isValid = await verifyCode(code, tempSession.code_hash);
    if (!isValid) {
      await handleFailedAttempt("tempSession", tempSessionDoc.id);
      return { success: false, error: "Invalid code" };
    }

    // Valid code. Delete the temp session
    await deleteTempSession(tempSessionDoc.id);

    if (tempSession.destination) {
      const emails = await getUserEmails(sessionData.user.id);
      const targetEmail = emails.find((e) => e.address.toLowerCase() === tempSession.destination.toLowerCase());
      if (targetEmail) {
        await verifyUserEmail(sessionData.user.id, targetEmail.id);
      }

      await recordSecurityActivity({
        userId: sessionData.user.id,
        event: "RECOVERY_EMAIL_VERIFIED",
        title: "Recovery email verified",
        description: `Verified recovery email address: ${tempSession.destination}`,
      });
    }

    revalidatePath("/profile");
    revalidatePath("/profile/recovery-email");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to verify email") };
  }
}

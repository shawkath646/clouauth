"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { handleError } from "@/utils/utils";
import { getServerTranslations } from "@/lib/i18n/server";
import { sendVerificationCodeEmail } from "@/lib/email";

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
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const { t } = await getServerTranslations("schema_security");
    const passwordSchema = getPasswordSchema(t);

    const parsed = passwordSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await prisma.passwordCredential.findUnique({
      where: { user_id: sessionData.user.id },
    });

    if (existing) {
      if (!parsed.data.currentPassword) {
        return { success: false, error: "Current password is required to set a new password." };
      }
      const isMatch = await bcrypt.compare(parsed.data.currentPassword, existing.password_hash);
      if (!isMatch) {
        return { success: false, error: "Incorrect current password." };
      }
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

    await prisma.passwordCredential.upsert({
      where: { user_id: sessionData.user.id },
      update: {
        password_hash: newHash,
        last_changed_on: new Date(),
        force_change: false,
        failed_attempts: 0,
        locked_until: null,
      },
      create: {
        user_id: sessionData.user.id,
        password_hash: newHash,
        last_changed_on: new Date(),
        force_change: false,
      },
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

    const { t } = await getServerTranslations("schema_security");
    const emailSchema = getEmailSchema(t);

    const parsed = emailSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existingRecovery = await prisma.userEmail.findFirst({
      where: {
        user_id: sessionData.user.id,
        is_primary: false,
      },
    });

    if (existingRecovery) {
      await prisma.userEmail.update({
        where: { id: existingRecovery.id },
        data: {
          address: parsed.data.email.toLowerCase(),
          verified: false,
        },
      });
    } else {
      await prisma.userEmail.create({
        data: {
          user_id: sessionData.user.id,
          address: parsed.data.email.toLowerCase(),
          verified: false,
          is_primary: false,
        },
      });
    }

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

    const { t } = await getServerTranslations("schema_security");
    const phoneSchema = getPhoneSchema(t);

    const parsed = phoneSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await prisma.twoFactorMethod.create({
      data: {
        user_id: sessionData.user.id,
        type: "phone",
        enabled: true,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/profile/phone");
    revalidatePath("/profile/authenticator");
    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute addPhoneMethodAction");
    return { success: false, error: em };
  }
}

export async function removeTwoFactorMethodAction(methodId: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const method = await prisma.twoFactorMethod.findUnique({
      where: { id: methodId },
    });

    if (!method || method.user_id !== sessionData.user.id) {
      return { success: false, error: "Verification method not found or unauthorized" };
    }

    await prisma.twoFactorMethod.delete({
      where: { id: methodId },
    });

    revalidatePath("/profile");
    revalidatePath("/profile/phone");
    revalidatePath("/profile/authenticator");
    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute removeTwoFactorMethodAction");
    return { success: false, error: em };
  }
}

export async function generateBackupCodesAction() {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    await prisma.recoveryCode.deleteMany({
      where: { user_id: sessionData.user.id },
    });

    const codes: string[] = [];
    const hashPromises: Promise<{ user_id: string; code_hash: string; used: boolean }>[] = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
      codes.push(formatted);
      hashPromises.push(
        bcrypt.hash(formatted, 12).then((hash) => ({
          user_id: sessionData.user.id,
          code_hash: hash,
          used: false,
        }))
      );
    }

    const createData = await Promise.all(hashPromises);

    await prisma.recoveryCode.createMany({
      data: createData,
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
    const codeHash = await bcrypt.hash(rawCode, 12);

    await prisma.verificationCode.updateMany({
      where: { user_id: sessionData.user.id, type: "change_email", consumed_on: null },
      data: { consumed_on: new Date() }
    });

    await prisma.verificationCode.create({
      data: {
        user_id: sessionData.user.id,
        type: "change_email",
        destination: emailAddress,
        code_hash: codeHash,
        expires_on: new Date(Date.now() + 10 * 60 * 1000),
        failed_attempts: 0
      }
    });

    await sendVerificationCodeEmail(emailAddress, rawCode);

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to send code") };
  }
}

export async function verifyRecoveryEmailAction(code: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const vCode = await prisma.verificationCode.findFirst({
      where: { user_id: sessionData.user.id, type: "change_email", consumed_on: null },
      orderBy: { created_on: 'desc' }
    });

    if (!vCode || vCode.expires_on < new Date()) {
      return { success: false, error: "Code expired or not found" };
    }

    const isValid = await bcrypt.compare(code, vCode.code_hash);
    if (!isValid) return { success: false, error: "Invalid code" };

    await prisma.verificationCode.update({
      where: { id: vCode.id },
      data: { consumed_on: new Date() }
    });

    await prisma.userEmail.updateMany({
      where: { user_id: sessionData.user.id, address: vCode.destination },
      data: { verified: true }
    });

    revalidatePath("/profile");
    revalidatePath("/profile/recovery-email");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to verify email") };
  }
}

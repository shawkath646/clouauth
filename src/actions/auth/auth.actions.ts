"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSignInSchema, type SignInValues } from "@/schema/auth.schema";
import { createSession, deleteTempSession, signOut } from "@/lib/session";
import { cookies } from "next/headers";
import { handleError } from "@/utils/error";
import { getServerTranslations } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  evaluateAuthStepOrSignIn,
  type SignInReturn,
  type AccountDisabledReturn,
} from "./auth";
import {
  checkLockout,
  handleFailedAttempt,
  resetFailedAttempts,
  requireValidTempSession,
  USER_WITH_AUTH_INCLUDE,
} from "./helpers";
import { verifyRecaptcha } from "@/lib/recaptcha/server";

export type { SignInReturn, AccountDisabledReturn };

export async function signIn(data: SignInValues, recaptchaToken?: string): Promise<SignInReturn> {
  try {
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, { expectedAction: "signin" });
    if (!recaptchaResult.success) {
      return {
        action: "ERROR",
        error: recaptchaResult.error || "Security verification failed. Please try again.",
      };
    }

    const { t } = await getServerTranslations("schema_auth");
    const parsed = getSignInSchema(t).safeParse(data);

    if (!parsed.success) {
      return { action: "ERROR", error: "Invalid input data." };
    }

    const { username, password, rememberMe } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        ...USER_WITH_AUTH_INCLUDE,
        password: true,
      },
    });

    const creds = user?.password;
    if (!user || !creds) {
      return { action: "ERROR", error: "Invalid credentials! Please verify your username and password." };
    }

    const lockoutError = checkLockout(creds.locked_until, "Account locked due to too many failed attempts");
    if (lockoutError) {
      return { action: "ERROR", error: lockoutError };
    }

    const passwordMatch = await bcrypt.compare(password, creds.password_hash);

    if (!passwordMatch) {
      await handleFailedAttempt("password", user.id);
      return { action: "ERROR", error: "Invalid credentials! Please verify your username and password." };
    }

    if (creds.failed_attempts > 0 || creds.locked_until) {
      await resetFailedAttempts("password", user.id);
    }

    return await evaluateAuthStepOrSignIn(user, rememberMe, "credentials");
  } catch (e: unknown) {
    return { action: "ERROR", error: handleError(e, true) };
  }
}

export async function enableAccount(tempSessionId: string): Promise<SignInReturn> {
  try {
    const tempSession = await requireValidTempSession(tempSessionId);

    const accountStatus = await prisma.accountStatus.findUnique({
      where: { user_id: tempSession.user_id },
      select: { self_enable: true },
    });

    if (!accountStatus?.self_enable) {
      await deleteTempSession(tempSessionId);
      return { action: "ERROR", error: "Illegal operation detected!" };
    }

    await prisma.accountStatus.update({
      where: { user_id: tempSession.user_id },
      data: { is_active: true },
    });

    await createSession(tempSession.user_id, tempSession.remember_me);
    await deleteTempSession(tempSessionId);

    return { action: "LOGIN_SUCCESS" };
  } catch (e: unknown) {
    return { action: "ERROR", error: handleError(e, true) };
  }
}

export async function signOutAction() {
  try {
    await signOut();
    const cookieStore = await cookies();
    cookieStore.delete("theme_pref");
    revalidatePath("/", "layout");
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to execute signOutAction") };
  }
  redirect("/signin");
}
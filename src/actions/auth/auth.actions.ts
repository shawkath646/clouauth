"use server";

import prisma from "@/lib/prisma";
import { verifyPassword, hashPassword, needsRehash } from "@/lib/security/hash";
import { getSignInSchema, type SignInValues } from "@/schema/auth.schema";
import { deleteTempSession, signOut } from "@/lib/session";
import { cookies } from "next/headers";
import { handleError } from "@/utils/error";
import { getDictionary } from "@/lib/i18n/server";
import { defaultLocale } from "@/lib/i18n/config";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  evaluateAuthStepOrSignIn,
  processFinalSignIn,
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

export async function signIn(
  data: SignInValues,
  recaptchaToken?: string
): Promise<SignInReturn> {
  try {
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, {
      expectedAction: "signin",
    });
    if (!recaptchaResult.success) {
      return {
        action: "ERROR",
        error:
          recaptchaResult.error ||
          "Security verification failed. Please try again.",
      };
    }

    const schemaDict = await getDictionary("schema_auth", defaultLocale);
    const parsed = getSignInSchema(schemaDict).safeParse(data);

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
      return {
        action: "ERROR",
        error:
          "Invalid credentials! Please verify your username and password.",
      };
    }

    const lockoutError = checkLockout(
      creds.locked_until,
      "Account locked due to too many failed attempts"
    );
    if (lockoutError) {
      return { action: "ERROR", error: lockoutError };
    }

    const passwordMatch = await verifyPassword(password, creds.password_hash);

    if (!passwordMatch) {
      await handleFailedAttempt("password", user.id);
      return {
        action: "ERROR",
        error:
          "Invalid credentials! Please verify your username and password.",
      };
    }

    if (creds.failed_attempts > 0 || creds.locked_until) {
      await resetFailedAttempts("password", user.id);
    }

    // Transparent zero-downtime migration: upgrade legacy bcrypt hash to modern Argon2id
    if (needsRehash(creds.password_hash)) {
      hashPassword(password)
        .then((newHash) => {
          return prisma.passwordCredential.update({
            where: { user_id: user.id },
            data: { password_hash: newHash },
          });
        })
        .catch(() => {});
    }

    return await evaluateAuthStepOrSignIn(user, rememberMe, "credentials");
  } catch (e: unknown) {
    return { action: "ERROR", error: handleError(e, true) };
  }
}

export async function enableAccount(
  tempSessionId: string
): Promise<SignInReturn> {
  try {
    const tempSession = await requireValidTempSession(tempSessionId);

    if (tempSession.flow_type !== "reenable") {
      return {
        action: "ERROR",
        error: "Invalid session state for account reactivation.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: tempSession.user_id },
      include: USER_WITH_AUTH_INCLUDE,
    });

    if (!user || !user.account_status?.self_enable) {
      await deleteTempSession(tempSessionId);
      return { action: "ERROR", error: "Illegal operation detected!" };
    }

    // Verify that if 2FA is configured on this user, 2FA was already completed on this tempSession
    const has2FA =
      Boolean(user.two_factor?.passkeys?.length) ||
      Boolean(user.two_factor?.totp?.enabled) ||
      Boolean(user.two_factor?.email_id);

    if (has2FA && !tempSession.two_step_processed) {
      return await evaluateAuthStepOrSignIn(
        user,
        tempSession.remember_me,
        tempSession.auth_method || "credentials"
      );
    }

    await prisma.accountStatus.update({
      where: { user_id: tempSession.user_id },
      data: { is_active: true },
    });

    await deleteTempSession(tempSessionId);

    return await processFinalSignIn(
      {
        ...user,
        account_status: {
          ...user.account_status,
          is_active: true,
        },
      },
      tempSession.remember_me,
      undefined,
      {
        event: "ACCOUNT_REENABLED",
        title: "Account re-enabled",
        description: "Account was reactivated successfully by the user",
      }
    );
  } catch (e: unknown) {
    return { action: "ERROR", error: handleError(e, true) };
  }
}

export async function signOutAction(locale?: string) {
  try {
    await signOut();
    const cookieStore = await cookies();
    cookieStore.delete("theme_pref");
    revalidatePath("/", "layout");
  } catch (e: unknown) {
    return {
      success: false,
      error: handleError(e, "Failed to execute signOutAction"),
    };
  }
  redirect(locale ? `/${locale}/signin` : "/signin");
}

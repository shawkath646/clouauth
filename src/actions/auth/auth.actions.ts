"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, hashPassword, needsRehash } from "@/lib/security/hash";
import { getSignInSchema, type SignInValues } from "@/schema/auth.schema";
import { deleteTempSession, signOut } from "@/lib/session";
import { handleError } from "@/utils/error";
import { getDictionary } from "@/lib/i18n/server";
import { defaultLocale } from "@/lib/i18n/config";
import { verifyRecaptcha } from "@/lib/recaptcha/server";
import {
  evaluateAuthStepOrSignIn,
  processFinalSignIn,
  type SignInReturn,
  type AccountDisabledReturn,
} from "./auth";
import {
  checkLockout,
  reserveAttempt,
  resetFailedAttempts,
  requireValidTempSession,
  getAvailableMethods,
  getDummyPasswordHash,
  USER_WITH_AUTH_INCLUDE,
} from "./helpers";

export type { SignInReturn, AccountDisabledReturn };

const INVALID_CREDENTIALS =
  "Invalid credentials! Please verify your username and password.";
const LOCKED_MESSAGE = "Account locked due to too many failed attempts";

const fail = (error: string): SignInReturn => ({ action: "ERROR", error });

export async function signIn(
  data: SignInValues,
  recaptchaToken?: string
): Promise<SignInReturn> {
  try {
    const recaptcha = await verifyRecaptcha(recaptchaToken, {
      expectedAction: "signin",
    });
    if (!recaptcha.success) {
      return fail(
        recaptcha.error || "Security verification failed. Please try again."
      );
    }

    const schemaDict = await getDictionary("schema_auth", defaultLocale);
    const parsed = getSignInSchema(schemaDict).safeParse(data);
    if (!parsed.success) return fail("Invalid input data.");

    const { username, password, rememberMe } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { username },
      include: { ...USER_WITH_AUTH_INCLUDE, password: true },
    });

    const credentials = user?.password;
    if (!user || !credentials) {
      await verifyPassword(password, await getDummyPasswordHash());
      return fail(INVALID_CREDENTIALS);
    }

    const lockoutError = checkLockout(credentials.locked_until, LOCKED_MESSAGE);
    if (lockoutError) return fail(lockoutError);

    const blocked = await reserveAttempt("password", user.id, LOCKED_MESSAGE);
    if (blocked) return fail(blocked);

    if (!(await verifyPassword(password, credentials.password_hash))) {
      return fail(INVALID_CREDENTIALS);
    }

    await resetFailedAttempts("password", user.id);

    if (needsRehash(credentials.password_hash)) {
      after(() =>
        hashPassword(password)
          .then((password_hash) =>
            prisma.passwordCredential.update({
              where: { user_id: user.id },
              data: { password_hash },
            })
          )
          .catch(() => {})
      );
    }

    return await evaluateAuthStepOrSignIn(user, rememberMe, "credentials");
  } catch (e: unknown) {
    return fail(handleError(e, true));
  }
}

export async function enableAccount(tempSessionId: string): Promise<SignInReturn> {
  try {
    const tempSession = await requireValidTempSession(tempSessionId);

    if (tempSession.flow_type !== "reenable") {
      return fail("Invalid session state for account reactivation.");
    }

    const user = await prisma.user.findUnique({
      where: { id: tempSession.user_id },
      include: USER_WITH_AUTH_INCLUDE,
    });

    if (!user || !user.account_status?.self_enable) {
      await deleteTempSession(tempSessionId);
      return fail("Illegal operation detected!");
    }

    if (
      !tempSession.two_step_processed &&
      (await getAvailableMethods(user)).length > 0
    ) {
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
      { ...user, account_status: { ...user.account_status, is_active: true } },
      tempSession.remember_me,
      undefined,
      {
        event: "ACCOUNT_REENABLED",
        title: "Account re-enabled",
        description: "Account was reactivated successfully by the user",
      }
    );
  } catch (e: unknown) {
    return fail(handleError(e, true));
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
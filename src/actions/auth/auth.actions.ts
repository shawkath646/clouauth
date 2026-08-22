"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSignInSchema, type SignInValues } from "@/schema/auth.schema";
import { createSession, createTempSession, signOut, getTempSession, deleteTempSession } from "@/lib/session";
import { cookies } from "next/headers";
import { handleError } from "@/utils/error";
import { getServerTranslations } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { VerificationMethod } from "@/types/auth.types";

type AccountDisabledReturn<T extends boolean> = {
  action: "ACCOUNT_DISABLED";
  selfEnable: T;
} & (T extends true ? { tempSessionId: string } : object);

export type SignInReturn =
  | { action: "ERROR"; error: string }
  | AccountDisabledReturn<true>
  | AccountDisabledReturn<false>
  | {
      tempSessionId: string;
      action: "METHOD_SELECTION" | "VERIFICATION_PASSKEY" | "VERIFICATION_CODE" | "VERIFICATION_PHONE";
      methods: VerificationMethod[];
    }
  | { action: "LOGIN_SUCCESS" };

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const verificationMethodMap: Record<string, VerificationMethod> = {
  passkeys: { id: "passkeys", type: "passkey", name: "Passkey" },
  totp: { id: "totp", type: "totp", name: "Authenticator App" },
  email: { id: "email", type: "code", name: "Email Code" },
};

export async function signIn(data: SignInValues): Promise<SignInReturn> {
  try {
    const { t } = await getServerTranslations("schema_auth");
    const parsed = getSignInSchema(t).safeParse(data);
    
    if (!parsed.success) {
      return { action: "ERROR", error: "Invalid input data." };
    }
    
    const { username, password, rememberMe } = parsed.data;

    const userCreds = await prisma.user.findUnique({
      where: { username },
      select: { id: true, password: true }
    });

    if (!userCreds) return { action: "ERROR", error: "Invalid credentials! Please verify your username and password." };

    const creds = userCreds.password;
    if (!creds) return { action: "ERROR", error: "Invalid credentials! Please verify your username and password." };

    if (creds.locked_until && creds.locked_until > new Date()) {
      const minutesLeft = Math.ceil((creds.locked_until.getTime() - Date.now()) / 60000);
      return { action: "ERROR", error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.` };
    }

    const passwordMatch = await bcrypt.compare(password, creds.password_hash);

    if (!passwordMatch) {
      const updatedCreds = await prisma.passwordCredential.update({
        where: { user_id: userCreds.id },
        data: { failed_attempts: { increment: 1 } }
      });

      if (updatedCreds.failed_attempts >= MAX_ATTEMPTS) {
        await prisma.passwordCredential.update({
          where: { user_id: userCreds.id },
          data: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) }
        });
      }
      return { action: "ERROR", error: "Invalid credentials! Please verify your username and password." };
    }

    if (creds.failed_attempts > 0 || creds.locked_until) {
      await prisma.passwordCredential.update({
        where: { user_id: userCreds.id },
        data: { failed_attempts: 0, locked_until: null }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userCreds.id },
      include: {
        account_status: true,
        preferences: true,
        two_factor: {
          select: {
            passkeys: { select: { id: true } },
            totp: { select: { id: true } },
            email: { select: { id: true } },
          },
        },
      }
    });
    
    if (!user) return { action: "ERROR", error: "Invalid credentials! Please verify your username and password." };

    if (user.two_factor) {
      const methods: VerificationMethod[] = [];
      const tf = user.two_factor;

      if (tf.passkeys.length > 0) methods.push(verificationMethodMap.passkeys);
      if (tf.totp) methods.push(verificationMethodMap.totp);
      if (tf.email) methods.push(verificationMethodMap.email);

      if (methods.length > 0) {
        const tempSession = await createTempSession(user.id, rememberMe);
        return {
          action: "METHOD_SELECTION",
          tempSessionId: tempSession.id,
          methods,
        };
      }
    }

    return await processFinalSignIn(user, rememberMe);
  } catch (e: unknown) {
    return { action: "ERROR", error: handleError(e, true) };
  }
}

type FinalSignInUser = {
  id: string;
  account_status?: {
    is_active: boolean;
    self_enable: boolean;
  } | null;
  preferences?: {
    theme?: string | null;
    language?: string | null;
  } | null;
};

export async function processFinalSignIn(user: FinalSignInUser, rememberMe: boolean, tempSessionId?: string): Promise<SignInReturn> {
  if (user.account_status && !user.account_status.is_active) {
    if (user.account_status.self_enable) {
      const sessionId = tempSessionId || (await createTempSession(user.id, rememberMe)).id;
      return {
        action: "ACCOUNT_DISABLED",
        selfEnable: true,
        tempSessionId: sessionId,
      };
    }
    return { action: "ACCOUNT_DISABLED", selfEnable: false };
  }

  await createSession(user.id, rememberMe);

  if (user.preferences) {
    const cookieStore = await cookies();
    const secureCookie = process.env.NODE_ENV === "production";
    
    if (user.preferences.theme) {
      cookieStore.set("theme_pref", user.preferences.theme, { path: "/", httpOnly: false, sameSite: "lax", secure: secureCookie });
    }
    if (user.preferences.language) {
      cookieStore.set("NEXT_LOCALE", user.preferences.language, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 31536000, secure: secureCookie });
    }
  }

  revalidatePath("/", "layout");
  return { action: "LOGIN_SUCCESS" };
}

export async function finalizeSignIn(
  userId: string,
  tempSessionId: string
): Promise<SignInReturn> {
  const ts = await prisma.tempSession.findUnique({ where: { id: tempSessionId } });
  
  if (!ts || ts.user_id !== userId || ts.expires_on < new Date()) {
    return { action: "ERROR", error: "Session expired or invalid. Please sign in again." };
  }

  if (!ts.two_step_processed) {
    return { action: "ERROR", error: "Two-step verification incomplete." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { account_status: true, preferences: true }
  });

  if (!user) return { action: "ERROR", error: "User not found." };

  await deleteTempSession(tempSessionId);
  return processFinalSignIn(user, ts.remember_me, undefined);
}

export async function enableAccount(tempSessionId: string) {
  try {
    const tempSession = await getTempSession(tempSessionId);

    if (!tempSession || tempSession.expires_on < new Date()) {
      return { action: "ERROR", error: "Session expired. Please sign in again." };
    }
    
    const accountStatus = await prisma.accountStatus.findUnique({
      where: { user_id: tempSession.user_id },
      select: { self_enable: true }
    });

    if (!accountStatus?.self_enable) {
      await deleteTempSession(tempSessionId);
      return { action: "ERROR", error: "Illegal operation detected!" };
    }

    await prisma.accountStatus.update({
      where: { user_id: tempSession.user_id },
      data: { is_active: true }
    });

    await createSession(tempSession.user_id, tempSession.remember_me);
    await deleteTempSession(tempSessionId);
    
    return { action: "LOGIN_SUCCESS" };
  } catch (e: unknown) {
    return { action: "ERROR", error: handleError(e, "Failed to enable account") };
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

export async function signOutAll(userId: string) {
  await prisma.userSession.updateMany({
    where: { user_id: userId, revoked_on: null },
    data: { revoked_on: new Date() }
  });
}
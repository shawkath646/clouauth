"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSignInSchema, type SignInValues } from "@/schema/auth.schema";
import { VerificationMethodType } from "@/types/auth.types";
import { createSession, createTempSession, signOut } from "@/lib/session";
import { cookies } from "next/headers";
import { handleError } from "@/utils/error";
import { getServerTranslations } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function getLoginRedirectAction() {
  const cookieStore = await cookies();

  // Priority 1: OAuth Cookie
  if (cookieStore.has("oauth_auth_req")) {
    return { action: "CONSENT_SCREEN" as const, redirectUrl: null };
  }

  // Priority 2: Redirect Cookie
  const redirectCookie = cookieStore.get("redirect_to");
  if (redirectCookie && redirectCookie.value) {
    cookieStore.delete("redirect_to");
    const redirectUrl = redirectCookie.value;
    if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
      return { action: "REDIRECT" as const, redirectUrl };
    }
  }

  // Priority 3: Fallback Profile
  return { action: "REDIRECT" as const, redirectUrl: "/profile" };
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

type SignInUser = {
  id: string;
  two_factor_methods: { id: string, type: string }[];
};

export async function finalizeSignIn(userId: string, rememberMe: boolean = false, existingTempSessionId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { account_status: true, preferences: true }
  });

  if (user?.account_status && !user.account_status.is_active) {
    if (user.account_status.self_enable) {
      let tId = existingTempSessionId;
      if (!tId) {
        const ts = await createTempSession(userId);
        tId = ts.id;
      }
      return { success: true, requireReenable: true, tempSessionId: tId };
    }
    return { success: false, error: `Account is disabled. Reason: ${user.account_status.reason || "Please contact support."}` };
  }

  await createSession(userId, rememberMe);
  if (existingTempSessionId) {
    await import("@/lib/session").then(m => m.deleteTempSession(existingTempSessionId));
  }

  if (user?.preferences) {
    const cookieStore = await cookies();
    if (user.preferences.theme) {
      cookieStore.set("theme_pref", user.preferences.theme, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
    }
    if (user.preferences.language) {
      cookieStore.set("NEXT_LOCALE", user.preferences.language, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 31536000,
        secure: process.env.NODE_ENV === "production"
      });
    }
  }

  revalidatePath("/", "layout");
  const redirectAction = await getLoginRedirectAction();
  return { success: true, ...redirectAction };
}

export async function processUserSignIn(user: SignInUser, rememberMe: boolean = false) {
  const has2FA = user.two_factor_methods.length > 0;

  if (has2FA) {
    const tempSession = await createTempSession(user.id);
    return {
      success: true,
      require2FA: true,
      tempSessionId: tempSession.id,
      methods: user.two_factor_methods
        .filter(m => m.type !== "phone")
        .map(m => ({
          id: m.id,
          type: m.type as VerificationMethodType
        }))
    };
  }

  return await finalizeSignIn(user.id, rememberMe);
}

export async function signIn(data: SignInValues) {
  try {
    const { t } = await getServerTranslations("schema_auth");
    const signInSchema = getSignInSchema(t);
    const parsed = signInSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Invalid input data." };
    }
    const { username, password, rememberMe } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        password: true,
        account_status: true,
        two_factor_methods: {
          where: { enabled: true },
          select: { id: true, type: true }
        }
      }
    });

    if (!user) return { success: false, error: "Invalid credentials! Please verify your username and password." };

    if (user.account_status && !user.account_status.is_active) {
      if (user.account_status.self_enable) {
        const tempSession = await createTempSession(user.id);
        return { success: true, requireReenable: true, tempSessionId: tempSession.id };
      }
      return { success: false, error: "Account suspended! Please contact to support." };
    }

    const creds = user.password;
    if (!creds) return { success: false, error: "Password doesn't configured! Please use third party provider." };

    if (creds.locked_until && creds.locked_until > new Date()) {
      const minutesLeft = Math.ceil((creds.locked_until.getTime() - Date.now()) / 60000);
      return { success: false, error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.` };
    }

    const passwordMatch = await bcrypt.compare(password, creds.password_hash);

    if (!passwordMatch) {
      const updatedCreds = await prisma.passwordCredential.update({
        where: { user_id: user.id },
        data: { failed_attempts: { increment: 1 } }
      });

      if (updatedCreds.failed_attempts >= MAX_ATTEMPTS) {
        await prisma.passwordCredential.update({
          where: { user_id: user.id },
          data: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) }
        });
      }
      return { success: false, error: "Invalid credentials! Please verify your username and password." };
    }

    if (creds.failed_attempts > 0 || creds.locked_until) {
      await prisma.passwordCredential.update({
        where: { user_id: user.id },
        data: { failed_attempts: 0, locked_until: null }
      });
    }

    return await processUserSignIn(user, rememberMe);
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function signOutAction() {
  try {
    await signOut();
    const cookieStore = await cookies();
    cookieStore.delete("theme_pref");
    revalidatePath("/", "layout");
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute signOutAction");
    return { success: false, error: em };
  }
  redirect("/signin");
}

export async function signOutAll(userId: string) {
  await prisma.userSession.updateMany({
    where: { user_id: userId, revoked_on: null },
    data: { revoked_on: new Date() }
  });
}

export async function enableAccount(tempSessionId: string) {
  try {
    const { getTempSession, deleteTempSession } = await import("@/lib/session");
    const tempSession = await getTempSession(tempSessionId);

    if (!tempSession || tempSession.expires_on < new Date()) {
      return { success: false, error: "Session expired. Please sign in again." };
    }

    await prisma.accountStatus.update({
      where: { user_id: tempSession.user_id },
      data: { is_active: true }
    });

    await createSession(tempSession.user_id, false);
    await deleteTempSession(tempSessionId);

    const redirectAction = await getLoginRedirectAction();
    return { success: true, ...redirectAction };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to enable account") };
  }
}

export async function getAvailableMethods(tempSessionId: string) {
  const tempSession = await prisma.tempSession.findUnique({
    where: { id: tempSessionId },
    include: {
      user: {
        select: {
          two_factor_methods: {
            where: { enabled: true },
            select: { id: true, type: true }
          }
        }
      }
    }
  });

  if (!tempSession || tempSession.expires_on < new Date()) {
    return { success: false, error: "Invalid or expired session" };
  }

  return {
    success: true,
    methods: tempSession.user.two_factor_methods
      .filter(m => m.type !== "phone")
      .map(m => ({
        id: m.id,
        type: m.type as VerificationMethodType
      }))
  };
}

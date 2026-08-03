"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signInSchema, type SignInValues } from "@/schema/auth.schema";
import { VerificationMethodType } from "@/types/auth.types";
import { createSession, createTempSession, signOut } from "@/lib/session";
import { cookies } from "next/headers";
import { getErrorMessage } from "@/misc/utils";

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
        return { action: "REDIRECT" as const, redirectUrl: redirectCookie.value };
    }
    
    // Priority 3: Fallback Profile
    return { action: "REDIRECT" as const, redirectUrl: "/profile" };
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

type SignInUser = {
  id: string;
  is_active: boolean;
  two_factor_methods: { id: string, type: string }[];
};

export async function processUserSignIn(user: SignInUser, rememberMe: boolean = false) {
    if (!user.is_active) return { success: false, error: "Account is inactive. Please contact support." };

    const has2FA = user.two_factor_methods.length > 0;

    if (has2FA) {
      const tempSession = await createTempSession(user.id);
      return {
        success: true,
        require2FA: true,
        tempSessionId: tempSession.id,
        methods: user.two_factor_methods.map(m => ({
          id: m.id,
          type: m.type as VerificationMethodType
        }))
      };
    }

    await createSession(user.id, rememberMe);

    const redirectAction = await getLoginRedirectAction();
    return { success: true, ...redirectAction };
}

export async function signIn(data: SignInValues) {
  try {
    const parsed = signInSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Invalid input data." };
    }
    const { username, password, rememberMe } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        is_active: true,
        password: true,
        two_factor_methods: {
          where: { enabled: true },
          select: { id: true, type: true }
        }
      }
    });

    if (!user) return { success: false, error: "Invalid credentials." };

    const creds = user.password;
    if (!creds) return { success: false, error: "Invalid credentials." };

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
      return { success: false, error: "Invalid credentials." };
    }

    if (creds.failed_attempts > 0 || creds.locked_until) {
      await prisma.passwordCredential.update({
        where: { user_id: user.id },
        data: { failed_attempts: 0, locked_until: null }
      });
    }

    return await processUserSignIn(user, rememberMe);
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
  }
}

export async function signOutAction() {
  try {
    await signOut();
    return { success: true, redirectUrl: "/signin" };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
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
    methods: tempSession.user.two_factor_methods.map(m => ({
      id: m.id,
      type: m.type as VerificationMethodType
    }))
  };
}

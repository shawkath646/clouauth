"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getTempSession, deleteTempSession, createSession } from "@/lib/session";
import { getLoginRedirectAction } from "./auth.actions";
import { getErrorMessage } from "@/misc/utils";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function triggerVerificationMethod(tempSessionId: string, methodType: string) {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { success: false, error: "Session expired or invalid. Please sign in again." };
    }

    const user = await prisma.user.findUnique({
      where: { id: tempSession.user_id },
      select: {
        id: true,
        two_factor_methods: {
          where: { enabled: true, type: methodType },
          select: { id: true, type: true }
        }
      }
    });

    if (!user || user.two_factor_methods.length === 0) {
      return { success: false, error: "Verification method not available." };
    }

    const method = user.two_factor_methods[0];

    switch (methodType) {
      case "email":
      case "sms":
        return await sendVerificationCode(user.id);
      case "passkey":
        return await triggerPasskeyVerification(user.id);
      case "authenticator":
        return { success: true as const, message: "Please enter the code from your authenticator app." };
      default:
        return { success: false as const, error: "Unsupported verification method." };
    }
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false as const, error: em };
  }
}

async function sendVerificationCode(userId: string) {
  try {
    const rawCode = "12345678";
    const codeHash = await bcrypt.hash(rawCode, 10);

    const previousCode = await prisma.verificationCode.findFirst({
      where: { user_id: userId, type: "2fa", consumed_on: null },
      orderBy: { created_on: 'desc' }
    });

    const failedAttempts = previousCode?.failed_attempts || 0;
    const lockedUntil = previousCode?.locked_until || null;

    if (previousCode) {
      await prisma.verificationCode.updateMany({
        where: { user_id: userId, type: "2fa", consumed_on: null },
        data: { consumed_on: new Date() }
      });
    }

    await prisma.verificationCode.create({
      data: {
        user_id: userId,
        type: "2fa",
        destination: "user@example.com",
        code_hash: codeHash,
        expires_on: new Date(Date.now() + 10 * 60 * 1000),
        failed_attempts: failedAttempts,
        locked_until: lockedUntil
      }
    });

    return { success: true };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
  }
}

async function triggerPasskeyVerification(userId: string) {
  return { success: true, payload: { challenge: "mock-passkey-challenge" } };
}

export async function resolveCodeVerification(tempSessionId: string, code: string) {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { success: false, error: "Session expired or invalid. Please sign in again." };
    }

    const vCode = await prisma.verificationCode.findFirst({
      where: { user_id: tempSession.user_id, type: "2fa", consumed_on: null },
      orderBy: { created_on: 'desc' }
    });

    if (!vCode) return { success: false, error: "No active verification code found." };

    if (vCode.locked_until && vCode.locked_until > new Date()) {
      const minutesLeft = Math.ceil((vCode.locked_until.getTime() - Date.now()) / 60000);
      return { success: false, error: `Too many failed attempts. Try again in ${minutesLeft} minutes.` };
    }

    if (vCode.expires_on < new Date()) {
      return { success: false, error: "Verification code expired." };
    }

    const isValid = await bcrypt.compare(code, vCode.code_hash);

    if (!isValid) {
      const updatedCode = await prisma.verificationCode.update({
        where: { id: vCode.id },
        data: { failed_attempts: { increment: 1 } }
      });

      if (updatedCode.failed_attempts >= MAX_ATTEMPTS) {
        await prisma.verificationCode.update({
          where: { id: vCode.id },
          data: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) }
        });
      }
      return { success: false, error: "Invalid verification code." };
    }

    await prisma.verificationCode.update({
      where: { id: vCode.id },
      data: { consumed_on: new Date() }
    });

    await createSession(tempSession.user_id, false);
    await deleteTempSession(tempSessionId);

    const redirectAction = await getLoginRedirectAction();
    return { success: true, ...redirectAction };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolvePasskeyVerification(tempSessionId: string, payload: any) {
  try {
    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date()) {
      return { success: false, error: "Session expired or invalid." };
    }

    if (!payload || !payload.signature) {
      return { success: false, error: "Invalid passkey payload." };
    }

    await createSession(tempSession.user_id, false);
    await deleteTempSession(tempSessionId);

    const redirectAction = await getLoginRedirectAction();
    return { success: true, ...redirectAction };
  } catch (e: unknown) {
    const em = getErrorMessage(e);
    return { success: false, error: em };
  }
}

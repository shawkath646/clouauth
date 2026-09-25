import prisma from "@/lib/prisma";
import { handleError } from "@/utils/error";
import { VerificationMethod } from "@/types/auth.types";
import { verificationMethodMap } from "./helpers";

export type ResolvedTempSessionStep = {
  step: "CREDENTIALS" | "METHOD_SELECTION" | "REENABLE_ACCOUNT";
  methods: VerificationMethod[];
  userId?: string;
  error?: string;
};

export async function resolveTempSessionStep(
  tempSessionId: string
): Promise<ResolvedTempSessionStep> {
  try {
    if (!tempSessionId) {
      return { step: "CREDENTIALS", methods: [], error: "Session expired or invalid. Please sign in again." };
    }

    const tempSession = await prisma.tempSession.findUnique({
      where: { id: tempSessionId },
      include: {
        user: {
          select: {
            id: true,
            account_status: {
              select: {
                is_active: true,
                self_enable: true,
              },
            },
            two_factor: {
              select: {
                passkeys: { select: { id: true } },
                totp: { select: { id: true, enabled: true } },
                email_id: true,
              },
            },
          },
        },
      },
    });

    if (!tempSession || tempSession.expires_on < new Date()) {
      return { step: "CREDENTIALS", methods: [], error: "Session expired or invalid. Please sign in again." };
    }

    const user = tempSession.user;
    if (!user) {
      return { step: "CREDENTIALS", methods: [], error: "User not found" };
    }

    // 1. Account disabled check: determine if self-enable is permitted
    if (user.account_status && !user.account_status.is_active) {
      if (user.account_status.self_enable) {
        return { step: "REENABLE_ACCOUNT", methods: [], userId: user.id };
      }
      return { step: "CREDENTIALS", methods: [], error: "Account disabled" };
    }

    // 2. 2FA verification methods check
    const methods: VerificationMethod[] = [];
    const tf = user.two_factor;

    if (tf) {
      if (tf.passkeys && tf.passkeys.length > 0) {
        methods.push(verificationMethodMap.passkeys);
      }
      if (tf.totp && (tf.totp.enabled ?? true)) {
        methods.push(verificationMethodMap.totp);
      }
      if (tf.email_id) {
        methods.push(verificationMethodMap.email);
      }
    }

    if (methods.length > 0) {
      return { step: "METHOD_SELECTION", methods, userId: user.id };
    }

    return { step: "CREDENTIALS", methods: [], userId: user.id };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { step: "CREDENTIALS", methods: [], error: em };
  }
}

export async function getTempSessionMethods(
  tempSessionId: string
): Promise<{ success: boolean; methods?: VerificationMethod[]; error?: string }> {
  const resolved = await resolveTempSessionStep(tempSessionId);
  if (resolved.step === "METHOD_SELECTION") {
    return { success: true, methods: resolved.methods };
  }
  return { success: false, error: resolved.error || "No verification methods configured." };
}

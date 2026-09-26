import prisma from "@/lib/prisma";
import { handleError } from "@/utils/error";
import { VerificationMethod } from "@/types/auth.types";
import { verificationMethodMap, getWebAuthnConfig } from "./helpers";

export type SudoUserMeta = {
  username: string;
  displayName: string;
  avatar: string | null;
  initials: string;
  email: string | null;
};

export type SudoAvailableMethods = {
  hasPassword: boolean;
  connectedProviders: string[];
  hasPasskey: boolean;
  hasTotp: boolean;
  hasEmailOtp: boolean;
};

export type SudoMeta = {
  user: SudoUserMeta;
  availableMethods: SudoAvailableMethods;
  returnTo: string;
};

export type ResolvedTempSessionStep = {
  step: "CREDENTIALS" | "METHOD_SELECTION" | "REENABLE_ACCOUNT" | "SUDO_VERIFICATION";
  methods: VerificationMethod[];
  userId?: string;
  error?: string;
  sudoMeta?: SudoMeta;
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
                passkeys: { select: { id: true, rp_id: true } },
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

    // Handle Sudo Re-authentication Flow
    if (tempSession.flow_type === "sudo") {
      let returnTo = "/profile";
      if (tempSession.payload) {
        try {
          const parsed = JSON.parse(tempSession.payload);
          if (parsed.return_to && parsed.return_to.startsWith("/") && !parsed.return_to.startsWith("//")) {
            returnTo = parsed.return_to;
          }
        } catch {}
      }

      const fullUser = await prisma.user.findUnique({
        where: { id: tempSession.user_id },
        include: {
          password: true,
          oauth_accounts: true,
          emails: { where: { is_primary: true } },
          two_factor: {
            include: {
              passkeys: true,
              totp: true,
            },
          },
        },
      });

      if (!fullUser) {
        return { step: "CREDENTIALS", methods: [], error: "User not found" };
      }

      const displayName = `${fullUser.first_name || ""} ${fullUser.last_name || ""}`.trim() || fullUser.username;
      const initials = `${fullUser.first_name?.[0] || ""}${fullUser.last_name?.[0] || ""}`.toUpperCase() || "U";
      const primaryEmail = fullUser.emails[0]?.address || null;
      const connectedProviders = Array.from(new Set(fullUser.oauth_accounts.map((acc) => acc.provider.toLowerCase())));

      const { rpID } = await getWebAuthnConfig();
      const validPasskeys = fullUser.two_factor?.passkeys?.filter((p) => !p.rp_id || p.rp_id === rpID) || [];

      return {
        step: "SUDO_VERIFICATION",
        methods: [],
        userId: fullUser.id,
        sudoMeta: {
          user: {
            username: fullUser.username,
            displayName,
            avatar: fullUser.avatar,
            initials,
            email: primaryEmail,
          },
          availableMethods: {
            hasPassword: Boolean(fullUser.password),
            connectedProviders,
            hasPasskey: validPasskeys.length > 0,
            hasTotp: Boolean(fullUser.two_factor?.totp?.enabled),
            hasEmailOtp: Boolean(primaryEmail),
          },
          returnTo,
        },
      };
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
      const { rpID } = await getWebAuthnConfig();
      const validPasskeys = tf.passkeys?.filter(p => !p.rp_id || p.rp_id === rpID);
      if (validPasskeys && validPasskeys.length > 0) {
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

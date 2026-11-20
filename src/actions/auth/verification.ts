import "server-only";

import { getUser, getUserEmails } from "@/lib/users";
import {
  getTwoFactor,
  getPasswordCredential,
  getLinkedOAuthAccounts,
} from "@/lib/credentials";
import { getUserSession, getTempSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import type { VerificationMethod } from "@/types/auth.types";
import {
  verificationMethodMap,
  getWebAuthnConfig,
} from "./helpers";
import { getSafeReturnTo } from "@/utils/url";

export type TempSessionStep =
  | "CREDENTIALS"
  | "METHOD_SELECTION"
  | "REENABLE_ACCOUNT"
  | "SUDO_VERIFICATION";

export interface SudoMetadata {
  user: {
    username: string;
    displayName: string;
    avatar: string;
    initials: string;
    email: string | null;
  };
  availableMethods: {
    hasPassword: boolean;
    connectedProviders: string[];
    hasPasskey: boolean;
    hasTotp: boolean;
    hasEmailOtp: boolean;
  };
  returnTo: string;
}

export type SudoMeta = SudoMetadata;

export type ResolvedTempSessionStep = {
  step: TempSessionStep;
  methods: VerificationMethod[];
  userId?: string;
  sudoMeta?: SudoMetadata;
  error?: string;
};

export async function resolveTempSessionStep(
  tempSessionId: string
): Promise<ResolvedTempSessionStep> {
  try {
    if (!tempSessionId) {
      return {
        step: "CREDENTIALS",
        methods: [],
        error: "Session expired or invalid. Please sign in again.",
      };
    }

    const tempSession = await getTempSession(tempSessionId);

    if (!tempSession || new Date(tempSession.expires_on) < new Date()) {
      return {
        step: "CREDENTIALS",
        methods: [],
        error: "Session expired or invalid. Please sign in again.",
      };
    }

    const user = await getUser(tempSession.user_id);
    if (!user) {
      return { step: "CREDENTIALS", methods: [], error: "User not found" };
    }

    const emails = await getUserEmails(user.id);
    const twoFactor = await getTwoFactor(user.id);

    // Handle Sudo Re-authentication Flow
    if (tempSession.flow_type === "sudo") {
      const activeSession = await getUserSession();
      if (!activeSession || activeSession.user.id !== tempSession.user_id) {
        return {
          step: "CREDENTIALS",
          methods: [],
          error: "Unauthorized session for step-up verification.",
        };
      }

      let returnTo = "/profile";
      if (tempSession.payload) {
        try {
          const parsed = JSON.parse(tempSession.payload);
          if (parsed.return_to) {
            returnTo = getSafeReturnTo(parsed.return_to, "en");
          }
        } catch {}
      }

      const [passwordCred, oauthAccounts] = await Promise.all([
        getPasswordCredential(user.id),
        getLinkedOAuthAccounts(user.id),
      ]);

      const displayName =
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.username;
      const initials =
        `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
        "U";
      const primaryEmailObj = emails.find((e) => e.is_primary) || emails[0];
      const primaryEmail = primaryEmailObj?.address || null;
      const connectedProviders = Array.from(
        new Set(oauthAccounts.map((acc) => acc.provider.toLowerCase()))
      );

      const { rpID } = await getWebAuthnConfig();
      const validPasskeys =
        twoFactor.passkeys?.filter(
          (p) => !p.rp_id || p.rp_id === rpID
        ) || [];

      return {
        step: "SUDO_VERIFICATION",
        methods: [],
        userId: user.id,
        sudoMeta: {
          user: {
            username: user.username,
            displayName,
            avatar: user.avatar,
            initials,
            email: primaryEmail,
          },
          availableMethods: {
            hasPassword: Boolean(passwordCred),
            connectedProviders,
            hasPasskey: validPasskeys.length > 0,
            hasTotp: Boolean(twoFactor.totp_enabled),
            hasEmailOtp: Boolean(primaryEmail && primaryEmailObj?.verified),
          },
          returnTo,
        },
      };
    }

    // 1. Account disabled check: only show REENABLE_ACCOUNT if flow_type is explicitly "reenable"
    if (
      tempSession.flow_type === "reenable" &&
      user.account_status &&
      !user.account_status.is_active
    ) {
      if (user.account_status.self_enable) {
        return { step: "REENABLE_ACCOUNT", methods: [], userId: user.id };
      }
      return { step: "CREDENTIALS", methods: [], error: "Account disabled" };
    }

    // 2. 2FA verification methods check
    const methods: VerificationMethod[] = [];

    const { rpID } = await getWebAuthnConfig();
    const validPasskeys = twoFactor.passkeys?.filter(
      (p) => !p.rp_id || p.rp_id === rpID
    );
    if (validPasskeys && validPasskeys.length > 0) {
      methods.push(verificationMethodMap.passkeys);
    }
    if (twoFactor.totp_enabled) {
      methods.push(verificationMethodMap.totp);
    }
    if (twoFactor.email_id) {
      methods.push(verificationMethodMap.email);
    }

    // Supplementary Email 2FA Method: only provide if the user has a verified email address
    if (methods.length > 0 && !methods.some((m) => m.id === "email")) {
      const hasVerifiedEmail = emails.some((e) => e.verified);
      if (hasVerifiedEmail) {
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
): Promise<{
  success: boolean;
  methods?: VerificationMethod[];
  error?: string;
}> {
  const resolved = await resolveTempSessionStep(tempSessionId);
  if (resolved.step === "METHOD_SELECTION") {
    return { success: true, methods: resolved.methods };
  }
  return {
    success: false,
    error: resolved.error || "No verification methods configured.",
  };
}

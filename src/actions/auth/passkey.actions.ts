"use server";

import { getEnv } from "@/utils/env.server";
import {
  getUserPasskeys as getDbPasskeys,
  findPasskeyByCredentialId,
  addPasskey,
  updatePasskey,
  deletePasskey as deleteDbPasskey,
} from "@/lib/credentials";
import {
  createTempSession,
  updateTempSession,
  deleteTempSession,
} from "@/lib/session";
import { handleError } from "@/utils/error";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { requireUserSession, requireValidTempSession, getWebAuthnConfig } from "./helpers";
import { recordSecurityActivity } from "@/lib/security-activity";

export async function triggerPasskeyRegistration() {
  try {
    const sessionData = await requireUserSession();

    const existingPasskeys = await getDbPasskeys(sessionData.user.id);

    const { rpID } = await getWebAuthnConfig();
    const rpName = getEnv("NEXT_PUBLIC_APP_NAME", true) || "ClouAuth";
    const userDisplayName =
      [sessionData.user.first_name, sessionData.user.last_name].filter(Boolean).join(" ") ||
      sessionData.user.username;

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(sessionData.user.id),
      userName: sessionData.user.username,
      userDisplayName,
      excludeCredentials: existingPasskeys.map((p) => ({
        id: p.credential_id,
        type: "public-key" as const,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    const tempSession = await createTempSession(sessionData.user.id, {
      flowType: "passkey_registration",
    });
    await updateTempSession(tempSession.id, {
      challenge: options.challenge,
    });

    return { success: true, tempSessionId: tempSession.id, options };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function resolvePasskeyRegistration(
  tempSessionId: string,
  payload: RegistrationResponseJSON,
  deviceName: string
) {
  try {
    const sessionData = await requireUserSession();

    const tempSession = await requireValidTempSession(tempSessionId);
    if (!tempSession.challenge) {
      return { success: false, error: "Registration session missing challenge." };
    }

    if (tempSession.user_id !== sessionData.user.id) {
      return { success: false, error: "Session mismatch." };
    }

    const expectedChallenge = tempSession.challenge;

    // Immediately clear challenge to prevent reuse/replay
    await updateTempSession(tempSessionId, { challenge: null });

    if (!payload || !payload.id || !payload.response) {
      return { success: false, error: "Invalid registration payload from authenticator." };
    }

    const { expectedOrigin, expectedRPID, rpID } = await getWebAuthnConfig();

    const verification = await verifyRegistrationResponse({
      response: payload,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: "Passkey registration verification failed." };
    }

    const { credential } = verification.registrationInfo;

    // Check if credential ID already exists in DB
    const existingCred = await findPasskeyByCredentialId(credential.id);

    if (existingCred) {
      return { success: false, error: "This passkey device has already been registered." };
    }

    const passkey = await addPasskey(sessionData.user.id, {
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString("base64"),
      sign_count: credential.counter,
      device_name: deviceName.trim() || "Passkey / Security Key",
      rp_id: rpID,
    });

    await recordSecurityActivity({
      userId: sessionData.user.id,
      event: "PASSKEY_ADDED",
      title: "New passkey added",
      description: `Registered passkey: ${passkey.device_name || "Security Key"}`,
    });

    await deleteTempSession(tempSessionId).catch(() => {});

    return {
      success: true,
      passkey: {
        id: passkey.id,
        credential_id: passkey.credential_id,
        device_name: passkey.device_name,
        created_on: passkey.created_on,
        last_used_on: passkey.last_used_on || null,
      },
    };
  } catch (e: unknown) {
    await deleteTempSession(tempSessionId).catch(() => {});
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function updatePasskeyName(passkeyId: string, deviceName: string) {
  try {
    const sessionData = await requireUserSession();

    const passkeys = await getDbPasskeys(sessionData.user.id);
    const passkey = passkeys.find((p) => p.id === passkeyId);

    if (!passkey) {
      return { success: false, error: "Passkey not found." };
    }

    await updatePasskey(sessionData.user.id, passkeyId, {
      sign_count: passkey.sign_count,
      device_name: deviceName,
    });

    return {
      success: true,
      passkey: {
        id: passkey.id,
        credential_id: passkey.credential_id,
        device_name: deviceName,
        created_on: passkey.created_on,
        last_used_on: passkey.last_used_on || null,
      },
    };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function deletePasskey(passkeyId: string) {
  try {
    const sessionData = await requireUserSession();

    const passkeys = await getDbPasskeys(sessionData.user.id);
    const passkey = passkeys.find((p) => p.id === passkeyId);

    if (!passkey) {
      return { success: false, error: "Passkey not found." };
    }

    await deleteDbPasskey(sessionData.user.id, passkeyId);

    await recordSecurityActivity({
      userId: sessionData.user.id,
      event: "PASSKEY_REMOVED",
      title: "Passkey removed",
      description: `Removed passkey: ${passkey.device_name || "Security Key"}`,
    });

    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function getUserPasskeys() {
  try {
    const sessionData = await requireUserSession();
    const passkeys = await getDbPasskeys(sessionData.user.id);

    return {
      success: true,
      passkeys: passkeys.map((p) => ({
        id: p.id,
        credential_id: p.credential_id,
        device_name: p.device_name || null,
        created_on: p.created_on,
        last_used_on: p.last_used_on || null,
      })),
    };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

"use server";

import { getEnv } from "@/utils/env";
import prisma from "@/lib/prisma";
import { createTempSession, deleteTempSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { requireUserSession, requireValidTempSession, getWebAuthnConfig } from "./helpers";

export async function triggerPasskeyRegistration() {
  try {
    const sessionData = await requireUserSession();

    const existingPasskeys = await prisma.passkeyCredential.findMany({
      where: {
        two_factor_id: sessionData.user.id,
      },
      select: {
        credential_id: true,
      },
    });

    const { rpID } = getWebAuthnConfig();
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
    await prisma.tempSession.update({
      where: { id: tempSession.id },
      data: { challenge: options.challenge },
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
    await prisma.tempSession.update({
      where: { id: tempSessionId },
      data: { challenge: null },
    });

    if (!payload || !payload.id || !payload.response) {
      return { success: false, error: "Invalid registration payload from authenticator." };
    }

    const { expectedOrigin, expectedRPID } = getWebAuthnConfig();

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
    const existingCred = await prisma.passkeyCredential.findUnique({
      where: { credential_id: credential.id },
      select: { id: true },
    });

    if (existingCred) {
      return { success: false, error: "This passkey device has already been registered." };
    }

    const twoFactor = await prisma.twoFactor.upsert({
      where: { user_id: sessionData.user.id },
      update: {},
      create: { user_id: sessionData.user.id },
    });

    const passkey = await prisma.passkeyCredential.create({
      data: {
        two_factor_id: twoFactor.user_id,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString("base64"),
        sign_count: credential.counter,
        device_name: deviceName.trim() || "Passkey / Security Key",
      },
    });

    await deleteTempSession(tempSessionId).catch(() => {});

    return { success: true, passkey };
  } catch (e: unknown) {
    await deleteTempSession(tempSessionId).catch(() => {});
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function updatePasskeyName(passkeyId: string, deviceName: string) {
  try {
    const sessionData = await requireUserSession();

    const passkey = await prisma.passkeyCredential.findFirst({
      where: {
        id: passkeyId,
        two_factor_id: sessionData.user.id,
      },
    });

    if (!passkey) {
      return { success: false, error: "Passkey not found." };
    }

    const updated = await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: { device_name: deviceName },
    });

    return { success: true, passkey: updated };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function deletePasskey(passkeyId: string) {
  try {
    const sessionData = await requireUserSession();

    const passkey = await prisma.passkeyCredential.findFirst({
      where: {
        id: passkeyId,
        two_factor_id: sessionData.user.id,
      },
    });

    if (!passkey) {
      return { success: false, error: "Passkey not found." };
    }

    await prisma.passkeyCredential.delete({
      where: { id: passkey.id },
    });

    const remaining = await prisma.passkeyCredential.count({
      where: { two_factor_id: passkey.two_factor_id },
    });

    if (remaining === 0) {
      const twoFactor = await prisma.twoFactor.findUnique({
        where: { user_id: passkey.two_factor_id },
        include: { totp: true },
      });
      if (twoFactor && !twoFactor.totp && !twoFactor.email_id && !twoFactor.phone_id) {
        await prisma.twoFactor.delete({ where: { user_id: passkey.two_factor_id } });
      }
    }

    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

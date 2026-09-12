"use server";

import { getEnv } from "@/utils/env";
import prisma from "@/lib/prisma";
import { createTempSession, deleteTempSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { requireUserSession, requireValidTempSession, getWebAuthnConfig } from "./helpers";

export async function triggerPasskeyRegistration() {
  try {
    const sessionData = await requireUserSession();

    const existingPasskeys = await prisma.passkeyCredential.findMany({
      where: {
        two_factor_id: sessionData.user.id,
      },
    });

    const { rpID } = getWebAuthnConfig();
    const rpName = getEnv("NEXT_PUBLIC_APP_NAME", true) || "Clou";

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: sessionData.user.username,
      userDisplayName: sessionData.user.first_name
        ? `${sessionData.user.first_name} ${sessionData.user.last_name}`
        : sessionData.user.username,
      excludeCredentials: existingPasskeys.map((p) => ({
        id: p.credential_id,
      })),
      authenticatorSelection: {
        userVerification: "preferred",
      },
    });

    const tempSession = await createTempSession(sessionData.user.id);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolvePasskeyRegistration(tempSessionId: string, payload: any, deviceName: string) {
  try {
    const sessionData = await requireUserSession();

    const tempSession = await requireValidTempSession(tempSessionId);
    if (!tempSession.challenge) {
      return { success: false, error: "Registration session missing challenge." };
    }

    if (tempSession.user_id !== sessionData.user.id) {
      return { success: false, error: "Session mismatch." };
    }

    const { expectedOrigin, expectedRPID } = getWebAuthnConfig();

    const verification = await verifyRegistrationResponse({
      response: payload,
      expectedChallenge: tempSession.challenge,
      expectedOrigin,
      expectedRPID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: "Passkey registration verification failed." };
    }

    const { credential } = verification.registrationInfo;

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
        device_name: deviceName || "Security Key / Biometric",
      },
    });

    await deleteTempSession(tempSessionId);

    return { success: true, passkey };
  } catch (e: unknown) {
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

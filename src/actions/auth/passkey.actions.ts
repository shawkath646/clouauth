"use server";

import prisma from "@/lib/prisma";
import { getUserSession, createTempSession, getTempSession, deleteTempSession } from "@/lib/session";
import { handleError } from "@/utils/utils";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

export async function getUserPasskeys() {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const passkeys = await prisma.passkeyCredential.findMany({
      where: {
        two_factor_method: {
          user_id: sessionData.user.id,
        },
      },
      orderBy: { created_on: "desc" },
      select: {
        id: true,
        credential_id: true,
        device_name: true,
        created_on: true,
        last_used_on: true,
      },
    });

    return { success: true, passkeys };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute getUserPasskeys");
    return { success: false, error: em };
  }
}

export async function triggerPasskeyRegistration() {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const existingPasskeys = await prisma.passkeyCredential.findMany({
      where: {
        two_factor_method: {
          user_id: sessionData.user.id,
        },
      },
    });

    const rpID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
    const rpName = process.env.NEXT_PUBLIC_APP_NAME || "clouburstlab";

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
    const em = handleError(e, "Failed to execute triggerPasskeyRegistration");
    return { success: false, error: em };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolvePasskeyRegistration(tempSessionId: string, payload: any, deviceName: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const tempSession = await getTempSession(tempSessionId);
    if (!tempSession || tempSession.expires_on < new Date() || !tempSession.challenge) {
      return { success: false, error: "Registration session expired or invalid." };
    }

    if (tempSession.user_id !== sessionData.user.id) {
      return { success: false, error: "Session mismatch." };
    }

    const rpID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const expectedOrigin = [
      origin,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];

    const verification = await verifyRegistrationResponse({
      response: payload,
      expectedChallenge: tempSession.challenge,
      expectedOrigin,
      expectedRPID: [rpID, "localhost"],
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: "Passkey registration verification failed." };
    }

    const { credential } = verification.registrationInfo;

    let method = await prisma.twoFactorMethod.findFirst({
      where: { user_id: sessionData.user.id, type: "passkey" },
    });

    if (!method) {
      method = await prisma.twoFactorMethod.create({
        data: {
          user_id: sessionData.user.id,
          type: "passkey",
          enabled: true,
        },
      });
    } else if (!method.enabled) {
      method = await prisma.twoFactorMethod.update({
        where: { id: method.id },
        data: { enabled: true },
      });
    }

    const passkey = await prisma.passkeyCredential.create({
      data: {
        two_factor_method_id: method.id,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString("base64"),
        sign_count: credential.counter,
        device_name: deviceName || "Security Key / Biometric",
      },
    });

    await deleteTempSession(tempSessionId);

    return { success: true, passkey };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute resolvePasskeyRegistration");
    return { success: false, error: em };
  }
}

export async function updatePasskeyName(passkeyId: string, deviceName: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const passkey = await prisma.passkeyCredential.findFirst({
      where: {
        id: passkeyId,
        two_factor_method: {
          user_id: sessionData.user.id,
        },
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
    const em = handleError(e, "Failed to execute updatePasskeyName");
    return { success: false, error: em };
  }
}

export async function deletePasskey(passkeyId: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const passkey = await prisma.passkeyCredential.findFirst({
      where: {
        id: passkeyId,
        two_factor_method: {
          user_id: sessionData.user.id,
        },
      },
      include: {
        two_factor_method: true,
      },
    });

    if (!passkey) {
      return { success: false, error: "Passkey not found." };
    }

    await prisma.passkeyCredential.delete({
      where: { id: passkey.id },
    });

    const remaining = await prisma.passkeyCredential.count({
      where: { two_factor_method_id: passkey.two_factor_method_id },
    });

    if (remaining === 0) {
      await prisma.twoFactorMethod.update({
        where: { id: passkey.two_factor_method_id },
        data: { enabled: false },
      });
    }

    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute deletePasskey");
    return { success: false, error: em };
  }
}

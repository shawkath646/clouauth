"use server";

import prisma from "@/lib/prisma";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { handleError } from "@/utils/error";
import { revalidatePath } from "next/cache";
import { getEnv } from "@/utils/env";
import { encryptSymmetric } from "@/lib/encryption";
import { requireUserSession } from "./helpers";

export async function generateTotpSecretAction() {
  try {
    const sessionData = await requireUserSession();

    const issuer = getEnv("NEXT_PUBLIC_APP_NAME", true) || "Clou";
    const secret = generateSecret();
    const otpauth = generateURI({ label: sessionData.user.username, issuer, secret });
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    return { success: true, secret, qrCodeUrl };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

export async function verifyAndEnableTotpAction(secret: string, token: string) {
  try {
    const sessionData = await requireUserSession();

    const { valid } = await verify({ token, secret });
    if (!valid) {
      return { success: false, error: "Invalid verification code" };
    }

    // Ensure the TwoFactor record exists
    const twoFactor = await prisma.twoFactor.upsert({
      where: { user_id: sessionData.user.id },
      update: {},
      create: { user_id: sessionData.user.id },
    });

    const encryptedSecret = encryptSymmetric(secret);

    await prisma.totpMethod.upsert({
      where: { two_factor_id: twoFactor.user_id },
      update: {
        enabled: true,
        secret: encryptedSecret,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      },
      create: {
        two_factor_id: twoFactor.user_id,
        enabled: true,
        secret: encryptedSecret,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/profile/authenticator");

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, true) };
  }
}

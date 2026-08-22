"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { handleError } from "@/utils/error";
import { revalidatePath } from "next/cache";

export async function generateTotpSecretAction() {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({ where: { id: sessionData.user.id } });
    if (!user) return { success: false, error: "User not found" };

    const secret = generateSecret();
    // 'clouburstlab' will be shown as the issuer in the authenticator app
    const otpauth = generateURI({ label: user.username, issuer: 'clouburstlab', secret });
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    return { success: true, secret, qrCodeUrl };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to generate TOTP secret") };
  }
}

export async function verifyAndEnableTotpAction(secret: string, token: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const { valid } = await verify({ token, secret });
    if (!valid) {
      return { success: false, error: "Invalid verification code" };
    }

    // Ensure the TwoFactor record exists
    const twoFactor = await prisma.twoFactor.upsert({
      where: { user_id: sessionData.user.id },
      update: {},
      create: { user_id: sessionData.user.id }
    });

    const { encryptSymmetric } = await import("@/lib/encryption");
    const encryptedSecret = encryptSymmetric(secret);

    await prisma.totpMethod.upsert({
      where: { two_factor_id: twoFactor.user_id },
      update: {
        enabled: true,
        secret: encryptedSecret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30
      },
      create: {
        two_factor_id: twoFactor.user_id,
        enabled: true,
        secret: encryptedSecret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30
      }
    });

    revalidatePath("/profile");
    revalidatePath("/profile/authenticator");

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: handleError(e, "Failed to verify and enable TOTP") };
  }
}

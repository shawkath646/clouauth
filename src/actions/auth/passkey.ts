import prisma from "@/lib/prisma";
import { handleError } from "@/utils/error";
import { requireUserSession } from "./helpers";

export async function getUserPasskeys() {
  try {
    const sessionData = await requireUserSession();

    const passkeys = await prisma.passkeyCredential.findMany({
      where: {
        two_factor_id: sessionData.user.id,
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
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

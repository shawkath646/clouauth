import { NextResponse } from "next/server";
import { cleanupExpiredSessions } from "@/lib/session";
import { handleError } from "@/utils/error";
import { getEnv } from "@/utils/env.server";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = getEnv("CRON_SECRET", true);

    if (!cronSecret || !authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providedSecret = authHeader.substring(7);
    if (
      providedSecret.length !== cronSecret.length ||
      !crypto.timingSafeEqual(
        Buffer.from(providedSecret),
        Buffer.from(cronSecret)
      )
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await cleanupExpiredSessions();

    return NextResponse.json({
      success: true,
      deleted: {
        tempSessions: deleted.tempSessions,
        userSessions: deleted.userSessions,
        revokedTokens: deleted.revokedTokens,
      },
    });
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute GET");
    return NextResponse.json({ error: em }, { status: 500 });
  }
}

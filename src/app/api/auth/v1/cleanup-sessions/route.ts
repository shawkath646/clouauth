import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleError } from "@/utils/error";

import crypto from "crypto";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;
        
        if (!cronSecret || !authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const providedSecret = authHeader.substring(7);
        if (providedSecret.length !== cronSecret.length || !crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(cronSecret))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();

        // Run cleanup operations in parallel
        const [
            tempSessions,
            userSessions
        ] = await Promise.all([
            prisma.tempSession.deleteMany({
                where: { expires_on: { lt: now } }
            }),
            prisma.userSession.deleteMany({
                where: { expires_on: { lt: now } }
            })
        ]);

        return NextResponse.json({ 
            success: true, 
            deleted: {
                tempSessions: tempSessions.count,
                userSessions: userSessions.count
            }
        });

    } catch (e: unknown) {
    const em = handleError(e, "Failed to execute GET");
        return NextResponse.json({ error: em }, { status: 500 });
    }
}

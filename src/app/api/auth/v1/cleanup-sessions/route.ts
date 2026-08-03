import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/misc/utils";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;
        
        // Simple Bearer token check for the cron secret
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();

        // Run cleanup operations in parallel
        const [
            tempSessions,
            userSessions,
            verificationCodes
        ] = await Promise.all([
            prisma.tempSession.deleteMany({
                where: { expires_on: { lt: now } }
            }),
            prisma.userSession.deleteMany({
                where: { expires_on: { lt: now } }
            }),
            prisma.verificationCode.deleteMany({
                where: { expires_on: { lt: now } }
            })
        ]);

        return NextResponse.json({ 
            success: true, 
            deleted: {
                tempSessions: tempSessions.count,
                userSessions: userSessions.count,
                verificationCodes: verificationCodes.count
            }
        });

    } catch (e: unknown) {
    const em = getErrorMessage(e);
        console.error("Cron Cleanup Error:", e);
        return NextResponse.json({ error: em }, { status: 500 });
    }
}

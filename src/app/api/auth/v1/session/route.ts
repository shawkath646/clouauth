import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/session";
import { getErrorMessage } from "@/misc/utils";

export async function GET() {
    try {
        const sessionData = await getUserSession();
        
        if (!sessionData) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        
        return NextResponse.json({ success: true, data: sessionData });
    } catch (e: unknown) {
    const em = getErrorMessage(e);
        console.error("Session API Error:", e);
        return NextResponse.json({ success: false, error: em }, { status: 500 });
    }
}

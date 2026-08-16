import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/session";
import { handleError } from "@/utils/error";

export async function GET() {
    try {
        const sessionData = await getUserSession();
        
        if (!sessionData) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        
        return NextResponse.json({ success: true, data: sessionData });
    } catch (e: unknown) {
    const em = handleError(e, "Failed to execute GET");
        return NextResponse.json({ success: false, error: em }, { status: 500 });
    }
}

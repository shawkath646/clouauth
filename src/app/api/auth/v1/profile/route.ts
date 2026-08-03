import { NextResponse } from "next/server";
import { getSecuredFullProfile } from "@/actions/profile/get-profile";
import { getErrorMessage } from "@/misc/utils";

export async function GET() {
    try {
        const result = await getSecuredFullProfile();
        
        if (!result.success) {
            return NextResponse.json(result, { status: 401 });
        }
        
        return NextResponse.json(result);
    } catch (e: unknown) {
    const em = getErrorMessage(e);
        console.error("Profile API Error:", e);
        return NextResponse.json({ success: false, error: em }, { status: 500 });
    }
}

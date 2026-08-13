import { NextResponse } from "next/server";
import { getSecuredFullProfile } from "@/actions/profile/get-profile.actions";
import { handleError } from "@/utils/utils";

export async function GET() {
    try {
        const result = await getSecuredFullProfile();
        
        if (!result.success) {
            return NextResponse.json(result, { status: 401 });
        }
        
        return NextResponse.json(result);
    } catch (e: unknown) {
    const em = handleError(e, "Failed to execute GET");
        return NextResponse.json({ success: false, error: em }, { status: 500 });
    }
}

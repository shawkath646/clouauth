import { NextResponse } from "next/server";
import { signIn } from "@/actions/auth/auth.actions";
import { getErrorMessage } from "@/misc/utils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const result = await signIn(body);
        
        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }
    } catch (e: unknown) {
    const em = getErrorMessage(e);
        console.error("Legacy Signin API Error:", e);
        return NextResponse.json({ success: false, error: em }, { status: 500 });
    }
}

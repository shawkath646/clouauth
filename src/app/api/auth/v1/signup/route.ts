import { NextResponse } from "next/server";
import { signUp } from "@/actions/auth/signup.actions";
import { getErrorMessage } from "@/misc/utils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const result = await signUp(body);
        
        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }
    } catch (e: unknown) {
    const em = getErrorMessage(e);
        console.error("Legacy Signup API Error:", e);
        return NextResponse.json({ success: false, error: em }, { status: 500 });
    }
}

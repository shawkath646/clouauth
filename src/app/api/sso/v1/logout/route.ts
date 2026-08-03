import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json(
        { error: "not_implemented", error_description: "The end session endpoint is not yet implemented." },
        { status: 501 }
    );
}

export async function POST() {
    return NextResponse.json(
        { error: "not_implemented", error_description: "The end session endpoint is not yet implemented." },
        { status: 501 }
    );
}

import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        { error: "not_implemented", error_description: "The token revocation endpoint is not yet implemented." },
        { status: 501 }
    );
}

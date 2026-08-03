import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/misc/utils";

export async function GET() {
    try {
        const keys = await prisma.signingKey.findMany({
            where: {
                revokedAt: null,
            },
            select: {
                jwk: true,
            },
        });

        const jwks = keys.map((k) => JSON.parse(k.jwk));

        return NextResponse.json({ keys: jwks });
    } catch (e: unknown) {
        const em = getErrorMessage(e);
        console.error("Error generating JWKS:", em);
        return NextResponse.json({ error: em }, { status: 500 });
    }
}

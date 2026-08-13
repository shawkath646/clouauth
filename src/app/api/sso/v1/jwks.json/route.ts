import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleError } from "@/utils/utils";

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

        return NextResponse.json(
            { keys: jwks },
            {
                headers: {
                    "Cache-Control": "public, max-age=3600, s-maxage=3600",
                },
            }
        );
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute GET");
        return NextResponse.json({ error: em }, { status: 500 });
    }
}

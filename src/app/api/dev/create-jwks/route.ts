import { NextResponse } from "next/server";
import * as jose from "jose";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/misc/utils";

async function generateAndStoreJwks() {
    try {
        if (process.env.NODE_ENV !== "development") {
            return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }

        const { publicKey, privateKey } = await jose.generateKeyPair("RS256", { extractable: true });

        const publicJwk = await jose.exportJWK(publicKey);
        const privateJwk = await jose.exportJWK(privateKey);

        const kid = crypto.randomUUID();

        // Include kid, use, alg in the public JWK
        const jwk = {
            ...publicJwk,
            kid,
            use: "sig",
            alg: "RS256",
        };

        const created = await prisma.signingKey.create({
            data: {
                kid,
                kty: "RSA",
                alg: "RS256",
                use: "sig",
                publicKey: JSON.stringify(publicJwk),
                privateKey: JSON.stringify(privateJwk),
                jwk: JSON.stringify(jwk),
                active: true,
            }
        });

        return NextResponse.json({ success: true, keyId: created.kid });
    } catch (e: unknown) {
        const em = getErrorMessage(e);
        return NextResponse.json({ error: em }, { status: 500 });
    }
}

export async function GET() {
    return generateAndStoreJwks();
}

export async function POST() {
    return generateAndStoreJwks();
}

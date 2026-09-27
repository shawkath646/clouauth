import prisma from "@/lib/prisma";
import { generateKeyPair, exportJWK } from "jose";
import crypto from "crypto";

export async function getOrCreateActiveSigningKey() {
  const existingKey = await prisma.signingKey.findFirst({
    where: { active: true, revokedAt: null },
  });

  if (existingKey) {
    return existingKey;
  }

  // Generate a resilient 2048-bit RSA key pair for OIDC ID tokens
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });

  const kid = `clou_${crypto.randomBytes(8).toString("hex")}`;
  const publicJwk = await exportJWK(publicKey);
  const privateJwk = await exportJWK(privateKey);

  publicJwk.kid = kid;
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";

  privateJwk.kid = kid;
  privateJwk.alg = "RS256";
  privateJwk.use = "sig";

  const newKey = await prisma.signingKey.create({
    data: {
      kid,
      kty: "RSA",
      alg: "RS256",
      use: "sig",
      publicKey: JSON.stringify(publicJwk),
      privateKey: JSON.stringify(privateJwk),
      jwk: JSON.stringify(publicJwk),
      active: true,
    },
  });

  return newKey;
}

export async function getActivePublicJwks() {
  const keys = await prisma.signingKey.findMany({
    where: {
      revokedAt: null,
    },
    select: {
      jwk: true,
    },
  });

  if (keys.length === 0) {
    const active = await getOrCreateActiveSigningKey();
    return [JSON.parse(active.jwk)];
  }

  return keys.map((k) => JSON.parse(k.jwk));
}

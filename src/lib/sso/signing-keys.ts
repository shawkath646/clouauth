import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { db } from "@/lib/firebase";
import { generateKeyPair, exportJWK, type JWK } from "jose";
import crypto from "crypto";
import { encryptSymmetric, decryptSymmetric } from "@/lib/encryption";

export interface DBSigningKey {
  id: string;
  kid: string;
  kty: string;
  alg: string;
  use: string;
  publicKey: string;
  privateKey: string;
  jwk: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}

export async function getOrCreateActiveSigningKey(): Promise<DBSigningKey> {
  const snap = await db
    .collection("signing_keys")
    .where("active", "==", true)
    .where("revokedAt", "==", null)
    .limit(1)
    .get();

  if (!snap.empty) {
    const data = snap.docs[0].data();
    return {
      id: snap.docs[0].id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
    } as DBSigningKey;
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

  const encryptedPrivateJwk = encryptSymmetric(JSON.stringify(privateJwk));

  const now = new Date();
  const keyDoc = {
    id: kid,
    kid,
    kty: "RSA",
    alg: "RS256",
    use: "sig",
    publicKey: JSON.stringify(publicJwk),
    privateKey: encryptedPrivateJwk,
    jwk: JSON.stringify(publicJwk),
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt: null,
    revokedAt: null,
  };

  await db.collection("signing_keys").doc(kid).set(keyDoc);
  revalidateTag("sso-signing-keys", "default");

  return {
    ...keyDoc,
    createdAt: now,
    updatedAt: now,
  };
}

export function decryptSigningPrivateKey(storedPrivateKey: string): JWK {
  const decryptedJson = decryptSymmetric(storedPrivateKey);
  return JSON.parse(decryptedJson) as JWK;
}

export async function getActivePublicJwks(): Promise<JWK[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("sso-signing-keys");

  const snap = await db.collection("signing_keys").where("revokedAt", "==", null).get();

  if (snap.empty) {
    const active = await getOrCreateActiveSigningKey();
    return [JSON.parse(active.jwk)];
  }

  return snap.docs.map((k) => JSON.parse(k.data().jwk));
}

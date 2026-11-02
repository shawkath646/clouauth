
import "server-only";
import crypto from "crypto";
import { getEnv } from "@/utils/utils";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

let cachedEncryptionKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
    if (cachedEncryptionKey) return cachedEncryptionKey;

    const secret = getEnv("ENCRYPTION_KEY");

    if (!/^[0-9a-fA-F]{64}$/.test(secret)) {
        throw new Error(
            "ENCRYPTION_KEY must be a valid 32-byte hexadecimal key"
        );
    }

    cachedEncryptionKey = Buffer.from(secret, "hex");

    return cachedEncryptionKey;
}

export function encryptSymmetric(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        getEncryptionKey(),
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        "v1",
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted.toString("hex"),
    ].join(":");
}

export function decryptSymmetric(encryptedData: string): string {
    const [version, ivHex, authTagHex, encryptedHex, ...extra] =
        encryptedData.split(":");

    if (
        version !== "v1" ||
        !ivHex ||
        !authTagHex ||
        encryptedHex === undefined ||
        extra.length > 0 ||
        !/^[0-9a-f]*$/i.test(ivHex) ||
        !/^[0-9a-f]{32}$/i.test(authTagHex) ||
        !/^(?:[0-9a-f]{2})*$/i.test(encryptedHex) ||
        ivHex.length !== IV_LENGTH * 2
    ) {
        throw new Error("Invalid encrypted data format");
    }

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getEncryptionKey(),
        Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, "hex")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

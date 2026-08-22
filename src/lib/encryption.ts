import { getEnv } from "@/utils/env";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
    const secret = (process.env.ENCRYPTION_KEY || getEnv("JWT_SECRET"));
    return crypto.scryptSync(secret, "clouauth-salt", 32);
}

export function encryptSymmetric(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptSymmetric(encryptedData: string): string {
    if (!encryptedData.includes(":")) {
        // Fallback for plaintext (in case of legacy/unmigrated data)
        return encryptedData;
    }
    const parts = encryptedData.split(":");
    if (parts.length !== 3) throw new Error("Invalid encrypted data format");
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

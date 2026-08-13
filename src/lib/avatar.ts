import { Style, Avatar } from "@dicebear/core";
import initialsDef from "@dicebear/styles/initials.json";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value || value.trim() === "") {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

const R2_ENDPOINT_URL = getRequiredEnv("R2_ENDPOINT_URL");
const R2_ACCESS_KEY_ID = getRequiredEnv("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = getRequiredEnv("R2_SECRET_ACCESS_KEY");
export const R2_BUCKET_NAME = getRequiredEnv("R2_BUCKET_NAME");
export const R2_PUBLIC_URL = getRequiredEnv("R2_PUBLIC_URL");

export const s3Client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT_URL,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

export async function generateAndUploadAvatar(
    firstName: string,
    lastName: string
): Promise<string> {
    const seed = `${firstName} ${lastName}`;

    const gradients = [
        ["2563EB", "60A5FA"], // Blue
        ["7C3AED", "A855F7"], // Purple
        ["059669", "34D399"], // Emerald
        ["DC2626", "FB7185"], // Red/Pink
        ["EA580C", "FB923C"], // Orange
        ["0891B2", "22D3EE"], // Cyan
        ["4F46E5", "818CF8"], // Indigo
        ["BE185D", "F472B6"], // Rose
        ["15803D", "4ADE80"], // Green
        ["9333EA", "C084FC"], // Violet
    ];

    const hash = crypto.createHash("sha256").update(seed).digest();
    const backgroundColor = gradients[hash[0] % gradients.length];

    const avatar = new Avatar(new Style(initialsDef), {
        seed,
        size: 512,
        borderRadius: 50,
        scale: 0.82,
        fontWeight: 700,
        textColor: ["FFFFFF"],
        backgroundColor,
        backgroundColorFill: ["linear"]
    });

    const svg = avatar.toString();
    const buffer = Buffer.from(svg);

    const filename = `user_avatar/${crypto.randomUUID()}.svg`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: filename,
            Body: buffer,
            ContentType: "image/svg+xml",
        })
    );

    return `${R2_PUBLIC_URL}/${filename}`;
}
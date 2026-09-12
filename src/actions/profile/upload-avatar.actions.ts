"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { s3Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/avatar";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { handleError } from "@/utils/error";
import { validateImageMagicBytes } from "@/utils/image-validator";

export async function uploadCustomAvatar(formData: FormData) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
      return { success: false, error: "SVG images are not allowed for security reasons." };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Invalid file type. Must be an image." };
    }

    if (file.size > 1 * 1024 * 1024) {
      return { success: false, error: "File size exceeds 1MB limit" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const validatedImage = validateImageMagicBytes(buffer);
    if (!validatedImage) {
      return { success: false, error: "Invalid image format. Only genuine JPEG, PNG, and WebP images are allowed." };
    }

    // Fetch current user to get old avatar
    const user = await prisma.user.findUnique({
      where: { id: sessionData.user.id },
      select: { avatar: true }
    });

    if (user && user.avatar && user.avatar.startsWith(R2_PUBLIC_URL)) {
      // Extract key from old url
      const oldUrl = new URL(user.avatar);
      // Remove the leading slash from pathname
      const oldKey = oldUrl.pathname.substring(1); 
      
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: oldKey,
          })
        );
      } catch {
        // Ignore deletion errors
      }
    }

    const filename = `user_avatar/${sessionData.user.id}.${validatedImage.ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: validatedImage.mime,
      })
    );

    // Append timestamp to break browser cache
    const avatarUrl = `${R2_PUBLIC_URL}/${filename}?v=${Date.now()}`;

    await prisma.user.update({
      where: { id: sessionData.user.id },
      data: {
        avatar: avatarUrl,
      },
    });

    revalidatePath("/profile");
    return { success: true, data: { avatarUrl } };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute uploadCustomAvatar");
    return { success: false, error: em };
  }
}

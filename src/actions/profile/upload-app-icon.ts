"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { s3Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/avatar"; // R2 is generic
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { handleError } from "@/utils/utils";

export async function uploadAppIcon(formData: FormData, appId: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    // Verify ownership of the app
    const app = await prisma.userApp.findUnique({
      where: { id: appId },
      select: { author_id: true, icon: true }
    });

    if (!app || app.author_id !== sessionData.user.id) {
      return { success: false, error: "Application not found or access denied" };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Invalid file type. Must be an image." };
    }

    if (file.size > 1 * 1024 * 1024) {
      return { success: false, error: "File size exceeds 1MB limit" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Delete old icon if exists
    if (app.icon && app.icon.startsWith(R2_PUBLIC_URL)) {
      const oldUrl = new URL(app.icon);
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

    const ext = file.name.split('.').pop() || "jpg";
    const filename = `app_icons/${appId}_${Date.now()}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const iconUrl = `${R2_PUBLIC_URL}/${filename}`;

    await prisma.userApp.update({
      where: { id: appId },
      data: {
        icon: iconUrl,
      },
    });

    return { success: true, data: { iconUrl } };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute uploadAppIcon");
    return { success: false, error: em };
  }
}

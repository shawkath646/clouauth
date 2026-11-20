"use server";

import { getAppById, updateApp } from "@/lib/oauth/clients";
import { getUserSession } from "@/lib/session";
import { uploadToStorage, deleteFromStorage } from "@/lib/storage";
import { handleError } from "@/utils/error";
import { validateImageMagicBytes } from "@/utils/image.server";

export async function uploadAppIcon(formData: FormData, appId: string) {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) return { success: false, error: "Unauthorized" };

    // Verify ownership of the app
    const app = await getAppById(appId);

    if (!app || app.author_id !== sessionData.user.id) {
      return { success: false, error: "Application not found or access denied" };
    }

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
      return {
        success: false,
        error: "Invalid image format. Only genuine JPEG, PNG, and WebP images are allowed.",
      };
    }

    // Delete old icon if stored
    if (app.icon) {
      await deleteFromStorage(app.icon);
    }

    const path = `app_icons/${appId}_${Date.now()}.${validatedImage.ext}`;
    const iconUrl = await uploadToStorage({
      path,
      buffer,
      contentType: validatedImage.mime,
    });

    await updateApp(appId, {
      icon: iconUrl,
    });

    return { success: true, data: { iconUrl } };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute uploadAppIcon");
    return { success: false, error: em };
  }
}

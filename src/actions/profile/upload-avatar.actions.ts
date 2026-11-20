"use server";

import { getUser, updateUser } from "@/lib/users";
import { getUserSession } from "@/lib/session";
import { revalidatePath, revalidateTag } from "next/cache";
import { uploadToStorage, deleteFromStorage } from "@/lib/storage";
import { handleError } from "@/utils/error";
import { validateImageMagicBytes } from "@/utils/image.server";

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
      return {
        success: false,
        error: "Invalid image format. Only genuine JPEG, PNG, and WebP images are allowed.",
      };
    }

    // Clean up old avatar from storage if present
    const user = await getUser(sessionData.user.id);
    if (user && user.avatar) {
      await deleteFromStorage(user.avatar);
    }

    const path = `avatars/${sessionData.user.id}.${validatedImage.ext}`;
    const publicUrl = await uploadToStorage({
      path,
      buffer,
      contentType: validatedImage.mime,
    });

    const avatarUrl = `${publicUrl}?v=${Date.now()}`;

    await updateUser(sessionData.user.id, {
      avatar: avatarUrl,
    });

    revalidatePath("/profile");
    revalidateTag(`public-profile:${sessionData.user.username.toLowerCase()}`, "default");
    revalidateTag("public-profiles", "default");
    return { success: true, data: { avatarUrl } };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute uploadCustomAvatar");
    return { success: false, error: em };
  }
}

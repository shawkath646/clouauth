import "server-only";
import { bucket } from "@/lib/firebase";

/**
 * Uploads a file buffer to Firebase Storage in a specific folder.
 * Makes the object public and returns its permanent public URL:
 * https://storage.googleapis.com/{bucketName}/{path}
 */
export async function uploadToStorage(params: {
  path: string;
  buffer: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  const file = bucket.file(params.path);

  await file.save(params.buffer, {
    contentType: params.contentType,
    public: true,
    metadata: {
      cacheControl: params.cacheControl || "public, max-age=31536000, immutable",
    },
  });

  try {
    await file.makePublic();
  } catch {
    // Already public or uniform bucket policy
  }

  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

/**
 * Deletes a file from Firebase Storage given its public URL or path.
 * If the URL does not belong to this bucket, safely skips.
 */
export async function deleteFromStorage(urlOrPath?: string | null): Promise<boolean> {
  if (!urlOrPath) return false;
  try {
    let filePath = urlOrPath;

    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      const cleanUrl = urlOrPath.split("?")[0];
      const prefix = `https://storage.googleapis.com/${bucket.name}/`;
      if (cleanUrl.startsWith(prefix)) {
        filePath = cleanUrl.substring(prefix.length);
      } else {
        return false;
      }
    }

    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      return true;
    }
  } catch {
    // Ignore deletion errors
  }
  return false;
}

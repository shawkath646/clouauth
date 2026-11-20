import "server-only";

export interface ValidatedImage {
  ext: "jpg" | "png" | "webp";
  mime: "image/jpeg" | "image/png" | "image/webp";
}

/**
 * Validates image buffer magic bytes against strict image formats (JPEG, PNG, WebP).
 * Explicitly rejects SVGs or unrecognized formats.
 * Works with Node.js Buffer and standard Uint8Array.
 */
export function validateImageMagicBytes(
  buffer: Buffer | Uint8Array
): ValidatedImage | null {
  // JPEG: starts with FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { ext: "png", mime: "image/png" };
  }

  // WebP: starts with RIFF....WEBP (RIFF = 0x52 0x49 0x46 0x46, WEBP = 0x57 0x45 0x42 0x50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

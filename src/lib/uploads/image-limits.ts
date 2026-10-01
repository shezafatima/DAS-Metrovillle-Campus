/**
 * Browser-side image pre-check shared by news covers (003) and Settings (005).
 * It only gives the admin an immediate, specific message: the authoritative
 * checks are Cloudinary's `allowed_formats` (decoded content) at upload and the
 * server's `verifyUploadedImage` on save (Constitution V).
 */

export const IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type ImagePrecheckFailure = "bad_format" | "too_large";

/** True when the leading bytes are a JPEG, PNG or WebP signature. */
export function hasImageSignature(bytes: Uint8Array): boolean {
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png =
    bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  // WebP: "RIFF" + 4 size bytes + "WEBP"
  const webp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  return jpeg || png || webp;
}

/**
 * Checks the declared type, the size and the file's real first bytes, so a
 * PDF renamed `photo.jpg` (browsers report `image/jpeg` from the extension)
 * is refused before anything is uploaded. Returns null when acceptable.
 */
export async function precheckImage(file: File): Promise<ImagePrecheckFailure | null> {
  if (!(IMAGE_ALLOWED_TYPES as readonly string[]).includes(file.type)) return "bad_format";
  // Size before signature: an oversized file is reported as too large, whatever its bytes.
  if (file.size > IMAGE_MAX_BYTES) return "too_large";
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasImageSignature(head)) return "bad_format";
  return null;
}

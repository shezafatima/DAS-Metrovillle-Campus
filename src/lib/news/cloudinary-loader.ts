/**
 * Public image delivery (research.md §3, contracts/public-pages.md
 * Images). Inserts a Cloudinary transformation string right after
 * `/image/upload/` in a stored `secure_url`, so `next/image` requests
 * a screen-appropriate size instead of the original upload — no cloud
 * name needed at render time (it's already in the stored URL).
 */

const UPLOAD_MARKER = "/image/upload/";

function insertTransformation(src: string, transformation: string): string {
  const index = src.indexOf(UPLOAD_MARKER);
  if (index === -1) return src; // not a Cloudinary delivery URL — pass through unchanged
  const insertAt = index + UPLOAD_MARKER.length;
  return `${src.slice(0, insertAt)}${transformation}/${src.slice(insertAt)}`;
}

/** next/image `loader` for Cloudinary cover images: auto format/quality, capped to the requested width. */
export function cloudinaryLoader({ src, width }: { src: string; width: number }): string {
  return insertTransformation(src, `f_auto,q_auto,c_limit,w_${width}`);
}

/** Open Graph / Twitter card image: fixed 1200×630 fill crop. */
export function ogImageUrl(src: string): string {
  return insertTransformation(src, "c_fill,w_1200,h_630,f_auto,q_auto");
}

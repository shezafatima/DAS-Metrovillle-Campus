import { v2 as cloudinary } from "cloudinary";
import { getEnv } from "@/lib/env";

/**
 * Cloudinary wrapper for news cover images (research.md §3). Admin
 * uploads go straight from the browser to Cloudinary using a signature
 * this module mints; the database only ever stores the resulting URL
 * and public id — never a binary (docs/architecture.md "Media and
 * content").
 */

export const NEWS_COVER_FOLDER = "news/covers";
export const NEWS_COVER_MAX_BYTES = 5 * 1024 * 1024; // 5 MB — the site-wide image limit
export const NEWS_COVER_FORMATS = "jpg,png,webp";
export const NEWS_COVER_TRANSFORMATION = "c_limit,w_2400,h_2400";

let configured = false;
function ensureConfigured(): typeof cloudinary {
  if (!configured) {
    const env = getEnv();
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export interface SignedUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  transformation: string;
  maxBytes: number;
}

/**
 * Mints a signature for a direct browser→Cloudinary upload
 * (contracts/admin-news-api.md `POST /api/admin/uploads/sign`). The
 * signature covers folder/allowed_formats/transformation/timestamp, so
 * the browser cannot alter any of them — the API secret itself is
 * never returned.
 */
export function signNewsCoverUpload(): SignedUpload {
  const sdk = ensureConfigured();
  const env = getEnv();
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    timestamp,
    folder: NEWS_COVER_FOLDER,
    allowed_formats: NEWS_COVER_FORMATS,
    transformation: NEWS_COVER_TRANSFORMATION,
  };
  const signature = sdk.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder: NEWS_COVER_FOLDER,
    allowedFormats: NEWS_COVER_FORMATS,
    transformation: NEWS_COVER_TRANSFORMATION,
    maxBytes: NEWS_COVER_MAX_BYTES,
  };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "too_large" | "bad_format" | "wrong_folder" | "unavailable" };

const ALLOWED_VERIFY_FORMATS = new Set(["jpg", "jpeg", "png", "webp"]);

/**
 * Server-side confirmation that an uploaded cover really is what the
 * signed params promised — the browser upload alone isn't trusted
 * (contracts/admin-news-api.md "Cover-image verification"). Skipped in
 * non-production runs when NEWS_COVER_VERIFY=skip is set, so Playwright
 * specs can stub the Cloudinary upload itself without a live account
 * (sp.analyze finding I2) while still exercising the real save path.
 */
export async function verifyNewsCover(publicId: string): Promise<VerifyResult> {
  const env = getEnv();
  if (env.NEWS_COVER_VERIFY === "skip" && process.env.NODE_ENV !== "production") {
    return { ok: true };
  }
  if (!publicId.startsWith(`${NEWS_COVER_FOLDER}/`)) {
    return { ok: false, reason: "wrong_folder" };
  }
  const sdk = ensureConfigured();
  try {
    const resource = await sdk.api.resource(publicId);
    if (typeof resource.bytes === "number" && resource.bytes > NEWS_COVER_MAX_BYTES) {
      return { ok: false, reason: "too_large" };
    }
    const format = String(resource.format ?? "").toLowerCase();
    if (!ALLOWED_VERIFY_FORMATS.has(format)) {
      return { ok: false, reason: "bad_format" };
    }
    if (typeof resource.public_id === "string" && !resource.public_id.startsWith(`${NEWS_COVER_FOLDER}/`)) {
      return { ok: false, reason: "wrong_folder" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Signed direct browser→Cloudinary upload, lifted out of the news
 * CoverImageField (003) so Settings (005) reuses the same flow. The browser
 * asks a server route to mint a signature, then uploads straight to
 * Cloudinary; the API secret never leaves the server.
 */

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

export interface UploadedImage {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

export async function requestSignature(endpoint: string, kind: string): Promise<SignedUpload> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  if (!response.ok) throw new Error("sign request failed");
  return response.json();
}

export async function uploadToCloudinary(file: File, signed: SignedUpload): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("folder", signed.folder);
  form.append("allowed_formats", signed.allowedFormats);
  form.append("transformation", signed.transformation);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error("upload failed");
  return response.json() as Promise<UploadedImage>;
}

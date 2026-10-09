import { requireAdminAccess } from "@/lib/dal";
import { accessErrorResponse, NO_STORE, validationResponse } from "@/lib/route-errors";
import { SETTINGS_GALLERY_FOLDER, SETTINGS_HERO_FOLDER, signImageUpload } from "@/lib/cloudinary";

/**
 * Signs a direct browser→Cloudinary upload for a Settings image (005,
 * contracts/settings-actions.md). It is separate from the news signer so each
 * route keeps exactly one access requirement (`settings`). The API secret is
 * never returned.
 */
const FOLDERS = {
  "hero-desktop": SETTINGS_HERO_FOLDER,
  "hero-mobile": SETTINGS_HERO_FOLDER,
  gallery: SETTINGS_GALLERY_FOLDER,
} as const;

export async function POST(request: Request) {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return accessErrorResponse(access.reason);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationResponse({ kind: "Invalid request body." });
  }

  const kind = (body as { kind?: unknown } | null)?.kind;
  if (typeof kind !== "string" || !Object.hasOwn(FOLDERS, kind)) {
    return validationResponse({ kind: "Unknown upload kind." });
  }

  return Response.json(signImageUpload(FOLDERS[kind as keyof typeof FOLDERS]), { headers: NO_STORE });
}

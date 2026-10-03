import { requireAdminAccess } from "@/lib/dal";
import { cvDownloadName } from "@/lib/careers/download-name";
import { findDownloadableCv } from "@/lib/careers/cv-download";
import { getDocumentStore } from "@/lib/documents/store";
import { logSecurityEvent } from "@/lib/log";
import { accessErrorResponse, notFoundResponse, unavailableResponse } from "@/lib/route-errors";

/**
 * Downloads one applicant's CV (contracts/admin-careers-api.md). The only way
 * a CV reaches anyone: the session and the `careers` permission are checked
 * on every request, the bytes are streamed through the app (no URL to the
 * store is ever created or revealed), and the response is an attachment,
 * never something a browser renders inline.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess("careers");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  try {
    const application = await findDownloadableCv(id);
    if (!application) return notFoundResponse();

    const file = await getDocumentStore().get(application.key);
    if (!file) {
      // The record says a CV exists but the store has none: log the id only.
      logSecurityEvent({ type: "career_cv_missing", target: application.id });
      return notFoundResponse();
    }

    return new Response(file.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cvDownloadName(application)}"`,
        "Content-Length": String(file.size),
        "X-Content-Type-Options": "nosniff",
        // Defence in depth: even if a browser ever rendered the file, it would be sandboxed.
        "Content-Security-Policy": "sandbox",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return unavailableResponse();
  }
}

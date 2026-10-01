import { requireAdminAccess } from "@/lib/dal";
import { accessErrorResponse } from "@/lib/route-errors";
import { deleteSignup } from "@/lib/signup/mutations";
import { NO_STORE, notFoundResponse, unavailableResponse } from "@/lib/signup/route-errors";

/**
 * Soft-deletes one signup (FR-022; contracts/admin-signups-api.md).
 * `null` from deleteSignup covers both "unknown id" and "already
 * deleted" — the plugin's default filter excludes deleted docs from
 * the match, so a second delete on the same id correctly 404s.
 */
export async function DELETE(_request: Request, context: RouteContext<"/api/admin/signups/[id]">) {
  const access = await requireAdminAccess("careers");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  try {
    const result = await deleteSignup(id);
    if (!result) {
      return notFoundResponse();
    }
    return Response.json({ id: result.id, deleted: true }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

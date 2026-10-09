import { requireAdminAccess } from "@/lib/dal";
import { deleteCareerApplication } from "@/lib/careers/mutations";
import { NO_STORE, accessErrorResponse, notFoundResponse, unavailableResponse } from "@/lib/route-errors";

/**
 * Soft-deletes one application and removes its stored CV (spec FR-026,
 * contracts/admin-careers-api.md). Main admin only: deleting is what lets a
 * person apply again inside the reapply window, so a content manager, even
 * one holding `careers`, is refused (403) on the server.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  try {
    const result = await deleteCareerApplication(id);
    if (!result) return notFoundResponse();
    return Response.json({ id: result.id, deleted: true }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

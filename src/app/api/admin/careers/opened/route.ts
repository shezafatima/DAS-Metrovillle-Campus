import { requireAdminAccess } from "@/lib/dal";
import { markCareersOpened } from "@/lib/notifications/state";
import { NO_STORE, accessErrorResponse, unavailableResponse } from "@/lib/route-errors";

/** The Applications list's "opened" marker (contracts/admin-careers-api.md). Advances this admin's last-opened moment. */
export async function POST() {
  const access = await requireAdminAccess("careers");
  if (!access.ok) return accessErrorResponse(access.reason);

  try {
    const openedAt = await markCareersOpened(access.session.userId);
    return Response.json({ openedAt: openedAt.toISOString() }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

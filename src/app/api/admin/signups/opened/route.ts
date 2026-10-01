import { requireAdminAccess } from "@/lib/dal";
import { accessErrorResponse } from "@/lib/route-errors";
import { markSignupsOpened } from "@/lib/notifications/state";
import { NO_STORE, unavailableResponse } from "@/lib/route-errors";

/** The Signups list's "opened" marker (contracts/admin-notifications-api.md "POST /api/admin/signups/opened"). */
export async function POST() {
  const access = await requireAdminAccess("careers");
  if (!access.ok) return accessErrorResponse(access.reason);
  const { session } = access;

  try {
    await markSignupsOpened(session.userId);
    return Response.json({ signupsNew: 0 }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

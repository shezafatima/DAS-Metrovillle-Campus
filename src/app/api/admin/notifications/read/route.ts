import { requireAdminAccess } from "@/lib/dal";
import { markAllNotificationsRead } from "@/lib/notifications/mutations";
import { NO_STORE, accessErrorResponse, unavailableResponse } from "@/lib/route-errors";

/** "Mark all as read" (contracts/admin-notifications-api.md "POST .../read"). Only touches the kinds the caller may see (011). */
export async function POST() {
  const access = await requireAdminAccess("any");
  if (!access.ok) return accessErrorResponse(access.reason);

  try {
    await markAllNotificationsRead(access.session);
    return Response.json({ messagesNew: 0, applicationsNew: 0 }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

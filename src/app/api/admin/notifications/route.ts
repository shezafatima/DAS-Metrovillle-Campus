import { requireAdminAccess } from "@/lib/dal";
import { getNotificationsSummary } from "@/lib/notifications/queries";
import { NO_STORE, accessErrorResponse, unavailableResponse } from "@/lib/route-errors";

/**
 * Polled by NotificationsProvider (contracts/admin-notifications-api.md "GET").
 * Open to every signed-in user, but the summary only carries the kinds their
 * permissions allow (011 FR-010): a content manager without `messages` gets no
 * message counts or items, and registrations are never included.
 */
export async function GET() {
  const access = await requireAdminAccess("any");
  if (!access.ok) return accessErrorResponse(access.reason);

  try {
    const summary = await getNotificationsSummary(access.session);
    return Response.json(summary, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

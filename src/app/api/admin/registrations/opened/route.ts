import { requireAdminAccess } from "@/lib/dal";
import { markRegistrationsOpened } from "@/lib/notifications/state";
import { NO_STORE, accessErrorResponse, unavailableResponse } from "@/lib/route-errors";

/** The Registrations list's "opened" marker: advances this main admin's last-opened moment. */
export async function POST() {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return accessErrorResponse(access.reason);

  try {
    await markRegistrationsOpened(access.session.userId);
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

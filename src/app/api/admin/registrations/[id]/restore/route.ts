import { requireAdminAccess } from "@/lib/dal";
import { restore } from "@/lib/registration/admin-mutations";
import { NO_STORE, accessErrorResponse, unavailableResponse } from "@/lib/route-errors";

/** Restores a registration deleted within the last 30 days (and still within retention). Main admin only. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  try {
    const restored = await restore(id, { userId: access.session.userId, email: access.session.email });
    if (!restored) return Response.json({ error: "not_restorable" }, { status: 404, headers: NO_STORE });
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

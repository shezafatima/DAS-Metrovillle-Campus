import { z } from "zod";
import { requireAdminAccess } from "@/lib/dal";
import { softDelete, setStatus } from "@/lib/registration/admin-mutations";
import { REGISTRATION_STATUSES } from "@/lib/registration/rules";
import { NO_STORE, accessErrorResponse, notFoundResponse, unavailableResponse, validationResponse } from "@/lib/route-errors";

const bodySchema = z.object({ status: z.enum(REGISTRATION_STATUSES) });

/**
 * Registration status change and delete (contracts/admin-registrations-api.md).
 * Main admin only: a content manager, even one holding every grant, gets 403
 * and nothing changes. No response or log line carries a registration field.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationResponse({ status: "Choose a status." });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationResponse({ status: "Choose a status." });

  try {
    const result = await setStatus(id, parsed.data.status, { userId: access.session.userId, email: access.session.email });
    if (result === "not_found") return notFoundResponse();
    return Response.json({ ok: true, status: parsed.data.status }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  try {
    const deleted = await softDelete(id, { userId: access.session.userId, email: access.session.email });
    if (!deleted) return notFoundResponse();
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

import { requireAdminAccess } from "@/lib/dal";
import { accessErrorResponse } from "@/lib/route-errors";
import { messageStatusUpdateSchema } from "@/lib/validation/message";
import { fieldErrors } from "@/lib/validation/field-errors";
import { setMessageStatus, deleteMessage } from "@/lib/messages/mutations";
import {
  NO_STORE,
  validationResponse,
  notFoundResponse,
  unavailableResponse,
} from "@/lib/route-errors";

/** Status change (contracts/admin-messages-api.md "PATCH"). */
export async function PATCH(request: Request, context: RouteContext<"/api/admin/messages/[id]">) {
  const access = await requireAdminAccess("messages");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationResponse({ status: "Choose New, Read or Responded." });
  }

  const parsed = messageStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationResponse(fieldErrors(parsed.error));
  }

  try {
    const result = await setMessageStatus(id, parsed.data.status);
    if (!result) {
      return notFoundResponse();
    }
    return Response.json(result, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

/** Soft delete (contracts/admin-messages-api.md "DELETE"). */
export async function DELETE(_request: Request, context: RouteContext<"/api/admin/messages/[id]">) {
  const access = await requireAdminAccess("messages");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  try {
    const result = await deleteMessage(id);
    if (!result) {
      return notFoundResponse();
    }
    return Response.json({ id: result.id, deleted: true }, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

import { requireAdminAccess } from "@/lib/dal";
import { accessErrorResponse } from "@/lib/route-errors";
import { markMessageRead } from "@/lib/messages/mutations";
import { NO_STORE, notFoundResponse, unavailableResponse } from "@/lib/route-errors";

/**
 * Conditional "opened" transition: `new → read` only (contracts/
 * admin-messages-api.md). `null` covers unknown, malformed and deleted ids.
 */
export async function POST(_request: Request, context: RouteContext<"/api/admin/messages/[id]/read">) {
  const access = await requireAdminAccess("messages");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  try {
    const result = await markMessageRead(id);
    if (!result) {
      return notFoundResponse();
    }
    return Response.json(result, { headers: NO_STORE });
  } catch {
    return unavailableResponse();
  }
}

import { requireAdminSession } from "@/lib/dal";
import { markMessageRead } from "@/lib/messages/mutations";
import { NO_STORE, notFoundResponse, unauthorizedResponse, unavailableResponse } from "@/lib/route-errors";

/**
 * Conditional "opened" transition: `new → read` only (contracts/
 * admin-messages-api.md). `null` covers unknown, malformed and deleted ids.
 */
export async function POST(_request: Request, context: RouteContext<"/api/admin/messages/[id]/read">) {
  const session = await requireAdminSession({ mode: "api" });
  if (!session) {
    return unauthorizedResponse();
  }

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

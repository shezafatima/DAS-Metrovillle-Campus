import { requireAdminAccess } from "@/lib/dal";
import { accessErrorResponse } from "@/lib/route-errors";
import { setPostStatus } from "@/lib/news/mutations";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(_request: Request, context: RouteContext<"/api/admin/news/[id]/unpublish">) {
  const access = await requireAdminAccess("news");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  const result = await setPostStatus(id, "draft");
  if (!result) {
    return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  return Response.json(result, { headers: NO_STORE });
}

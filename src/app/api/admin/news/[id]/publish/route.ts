import { requireAdminSession } from "@/lib/dal";
import { setPostStatus } from "@/lib/news/mutations";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(_request: Request, context: RouteContext<"/api/admin/news/[id]/publish">) {
  const session = await requireAdminSession({ mode: "api" });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const { id } = await context.params;
  const result = await setPostStatus(id, "published");
  if (!result) {
    return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  return Response.json(result, { headers: NO_STORE });
}

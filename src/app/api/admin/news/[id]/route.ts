import { requireAdminAccess } from "@/lib/dal";
import { accessErrorResponse } from "@/lib/route-errors";
import { getAdminPost } from "@/lib/news/admin-queries";
import { updatePost, deletePost } from "@/lib/news/mutations";
import { mutationErrorResponse } from "@/lib/news/route-errors";
import { verifyNewsCover } from "@/lib/cloudinary";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: Request, context: RouteContext<"/api/admin/news/[id]">) {
  const access = await requireAdminAccess("news");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  const post = await getAdminPost(id);
  if (!post) {
    return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  return Response.json(post, { headers: NO_STORE });
}

export async function PUT(request: Request, context: RouteContext<"/api/admin/news/[id]">) {
  const access = await requireAdminAccess("news");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  try {
    const body = await request.json();
    const result = await updatePost(id, body, { verifyCover: verifyNewsCover });
    if (!result) {
      return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    return Response.json(result, { headers: NO_STORE });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/admin/news/[id]">) {
  const access = await requireAdminAccess("news");
  if (!access.ok) return accessErrorResponse(access.reason);

  const { id } = await context.params;
  const result = await deletePost(id);
  if (!result) {
    return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  return Response.json(result, { headers: NO_STORE });
}

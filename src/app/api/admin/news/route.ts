import { requireAdminAccess } from "@/lib/dal";
import { accessErrorResponse } from "@/lib/route-errors";
import { createPost } from "@/lib/news/mutations";
import { mutationErrorResponse } from "@/lib/news/route-errors";
import { verifyNewsCover } from "@/lib/cloudinary";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const access = await requireAdminAccess("news");
  if (!access.ok) return accessErrorResponse(access.reason);

  try {
    const body = await request.json();
    const result = await createPost(body, { verifyCover: verifyNewsCover });
    return Response.json(result, { status: 201, headers: NO_STORE });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}

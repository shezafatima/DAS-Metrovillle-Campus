import { requireAdminSession } from "@/lib/dal";
import { createPost } from "@/lib/news/mutations";
import { mutationErrorResponse } from "@/lib/news/route-errors";
import { verifyNewsCover } from "@/lib/cloudinary";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const session = await requireAdminSession({ mode: "api" });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const body = await request.json();
    const result = await createPost(body, { verifyCover: verifyNewsCover });
    return Response.json(result, { status: 201, headers: NO_STORE });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}

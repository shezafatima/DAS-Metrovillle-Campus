import { requireAdminSession } from "@/lib/dal";
import { signNewsCoverUpload } from "@/lib/cloudinary";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const session = await requireAdminSession({ mode: "api" });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "validation", fields: { kind: "Invalid request body." } }, { status: 400, headers: NO_STORE });
  }

  const kind = (body as { kind?: unknown } | null)?.kind;
  if (kind !== "news-cover") {
    return Response.json(
      { error: "validation", fields: { kind: "Unknown upload kind." } },
      { status: 400, headers: NO_STORE },
    );
  }

  const payload = signNewsCoverUpload();
  return Response.json(payload, { headers: NO_STORE });
}

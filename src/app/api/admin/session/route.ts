import { requireAdminAccess } from "@/lib/dal";
import { accessErrorResponse } from "@/lib/route-errors";

export async function GET() {
  const access = await requireAdminAccess("any");
  if (!access.ok) return accessErrorResponse(access.reason);

  return Response.json(
    { email: access.session.email },
    { headers: { "Cache-Control": "no-store" } },
  );
}

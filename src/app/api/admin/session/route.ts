import { requireAdminSession } from "@/lib/dal";

export async function GET() {
  const session = await requireAdminSession({ mode: "api" });

  if (!session) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { email: session.email },
    { headers: { "Cache-Control": "no-store" } },
  );
}

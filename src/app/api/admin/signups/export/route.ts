import { requireAdminSession } from "@/lib/dal";
import { findSignupsForExport } from "@/lib/signup/admin-queries";
import { signupsToCsv } from "@/lib/signup/csv";
import { csvDateStamp } from "@/lib/signup/dates";
import { NO_STORE, unauthorizedResponse, unavailableResponse } from "@/lib/signup/route-errors";

/**
 * Downloads every signup matching the current search/filter as CSV
 * (FR-027/FR-028; contracts/admin-signups-api.md). Unpaginated — every
 * matching record, not just the current page.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await requireAdminSession({ mode: "api" });
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const source = searchParams.get("source") ?? undefined;
    const rows = await findSignupsForExport({ q, source });

    return new Response(signupsToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="signups-${csvDateStamp(new Date())}.csv"`,
        ...NO_STORE,
      },
    });
  } catch {
    return unavailableResponse();
  }
}

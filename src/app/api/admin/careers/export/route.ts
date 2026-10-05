import { requireAdminAccess } from "@/lib/dal";
import { findApplicationsForExport } from "@/lib/careers/admin-queries";
import { applicationsToCsv } from "@/lib/careers/csv";
import { pktDateString } from "@/lib/careers/rules";
import { NO_STORE, accessErrorResponse, unavailableResponse } from "@/lib/route-errors";

/**
 * Downloads every application matching the current search as CSV (spec
 * FR-027, contracts/admin-careers-api.md). Unpaginated, and without any file
 * data: the rows have no field for it.
 */
export async function GET(request: Request): Promise<Response> {
  const access = await requireAdminAccess("careers");
  if (!access.ok) return accessErrorResponse(access.reason);

  try {
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    const rows = await findApplicationsForExport({ q });

    return new Response(applicationsToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="applications-${pktDateString(new Date())}.csv"`,
        ...NO_STORE,
      },
    });
  } catch {
    return unavailableResponse();
  }
}

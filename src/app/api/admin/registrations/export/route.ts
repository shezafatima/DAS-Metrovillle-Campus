import { connectDb } from "@/lib/db";
import { requireAdminAccess } from "@/lib/dal";
import { logSecurityEvent } from "@/lib/log";
import { findRegistrationsForExport } from "@/lib/registration/admin-queries";
import { registrationsToCsv } from "@/lib/registration/csv";
import { NO_STORE, accessErrorResponse, unavailableResponse } from "@/lib/route-errors";
import { karachiToday } from "@/lib/admission/window";
import { RegistrationExport } from "@/models/registration-export";

/**
 * Downloads every registration matching the current search and class filter
 * as CSV, and records the export (who, when, how many rows). The record holds
 * no registration content and not the search text (research §11). Main admin only.
 */
export async function GET(request: Request): Promise<Response> {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return accessErrorResponse(access.reason);

  try {
    const params = new URL(request.url).searchParams;
    const q = params.get("q") ?? undefined;
    const className = params.get("class") ?? undefined;
    const rows = await findRegistrationsForExport({ q, className });
    const body = registrationsToCsv(rows);

    const now = new Date();
    await connectDb();
    await RegistrationExport.create({
      at: now,
      byUserId: access.session.userId,
      byEmail: access.session.email,
      rows: rows.length,
      classFilter: className?.trim() || null,
      searched: Boolean(q?.trim()),
    });
    logSecurityEvent({ type: "registration_exported", email: access.session.email, outcome: String(rows.length) });

    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registrations-${karachiToday(now)}.csv"`,
        ...NO_STORE,
      },
    });
  } catch {
    return unavailableResponse();
  }
}

import { toCsv } from "@/lib/csv";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import type { CareerApplicationRow } from "@/lib/careers/admin-queries";

/**
 * CSV export for the Applications list (spec FR-027): the encoding (RFC 4180
 * quoting, UTF-8 BOM so Excel shows Urdu names correctly, CRLF, formula
 * guard) is the shared src/lib/csv.ts. No file data and no storage key: the
 * row type has no field for either.
 */
export const APPLICATION_CSV_HEADERS = ["Name", "Email", "Phone", "Qualification", "Applied"];

export function applicationsToCsv(rows: CareerApplicationRow[]): string {
  return toCsv(
    APPLICATION_CSV_HEADERS,
    rows.map((row) => [row.name, row.email, row.phoneDisplay, row.qualification, formatAdminDateTime(new Date(row.appliedAt))]),
  );
}

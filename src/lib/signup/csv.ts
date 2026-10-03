import { csvField, toCsv } from "@/lib/csv";
import { sourceLabel, type SignupSource } from "@/lib/signup/sources";
import { formatSignupDateTime } from "@/lib/signup/dates";
import type { SignupRow } from "@/lib/signup/admin-queries";

/**
 * CSV export for the admin signup list (FR-027/FR-028; research.md §7).
 * The encoding itself (RFC 4180 quoting, UTF-8 BOM for Excel, formula
 * guard) lives in the shared src/lib/csv.ts; `csvField` is re-exported so
 * existing imports keep working until signup is retired (012 US7).
 */
export const CSV_HEADERS = ["Name", "Email", "Phone", "Pages", "First signup", "Latest signup"];

export { csvField };

function rowToFields(row: SignupRow): string[] {
  const pages = (row.sources as SignupSource[]).map(sourceLabel).join("; ");
  return [
    row.name,
    row.email,
    row.phoneDisplay,
    pages,
    formatSignupDateTime(new Date(row.firstSignupAt)),
    formatSignupDateTime(new Date(row.lastSignupAt)),
  ];
}

/** BOM + header + one row per record, CRLF line endings throughout. */
export function signupsToCsv(rows: SignupRow[]): string {
  return toCsv(CSV_HEADERS, rows.map(rowToFields));
}

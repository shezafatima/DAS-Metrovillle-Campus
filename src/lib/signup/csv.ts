import { sourceLabel, type SignupSource } from "@/lib/signup/sources";
import { formatSignupDateTime } from "@/lib/signup/dates";
import type { SignupRow } from "@/lib/signup/admin-queries";

/**
 * CSV export for the admin signup list (FR-027/FR-028; research.md
 * §7). RFC 4180 quoting throughout, a leading UTF-8 BOM so Excel on
 * Windows decodes Urdu names correctly, and a formula-injection guard
 * on any field that would otherwise be interpreted as a spreadsheet
 * formula by Excel/Sheets.
 */
export const CSV_HEADERS = ["Name", "Email", "Phone", "Pages", "First signup", "Latest signup"];

const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

/** Quotes one CSV field (RFC 4180) and neutralises a leading formula character. */
export function csvField(value: string): string {
  const safe = FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function rowToCsvLine(row: SignupRow): string {
  const pages = (row.sources as SignupSource[]).map(sourceLabel).join("; ");
  const fields = [
    row.name,
    row.email,
    row.phoneDisplay,
    pages,
    formatSignupDateTime(new Date(row.firstSignupAt)),
    formatSignupDateTime(new Date(row.lastSignupAt)),
  ];
  return fields.map(csvField).join(",");
}

/** `﻿` + header + one row per record, CRLF line endings throughout. */
export function signupsToCsv(rows: SignupRow[]): string {
  const lines = [CSV_HEADERS.map(csvField).join(","), ...rows.map(rowToCsvLine)];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

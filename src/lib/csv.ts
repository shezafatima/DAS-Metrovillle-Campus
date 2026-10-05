/**
 * CSV encoding shared by admin exports (lifted out of the retired signup export
 * for 012 careers). RFC 4180 quoting throughout, a leading UTF-8 BOM so
 * Excel on Windows decodes Urdu names correctly, CRLF line endings, and a
 * formula-injection guard on any field that Excel or Sheets would otherwise
 * interpret as a formula.
 */
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

/** Quotes one CSV field (RFC 4180) and neutralises a leading formula character. */
export function csvField(value: string): string {
  const safe = FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** BOM + header + one line per row, CRLF throughout. With no rows it is the BOM and the header only. */
export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [headers.map(csvField).join(","), ...rows.map((row) => row.map(csvField).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

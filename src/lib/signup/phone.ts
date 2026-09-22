/**
 * Pakistani mobile phone handling for the signup form (FR-006;
 * research.md §2). Storage form is E.164 (`+923XXXXXXXXX`, settled
 * against docs/architecture.md during planning); the admin sees the
 * local form (`03XXXXXXXXX`) they recognise.
 */

const MOBILE_PATTERN = /^(?:\+92|92|0)(3\d{9})$/;

/**
 * Accepts the brief's formats (spaces/hyphens/dots/parentheses between
 * digit groups) and normalises to `+923XXXXXXXXX`. Rejects landlines,
 * short numbers and non-Pakistani numbers — `null` on anything that
 * isn't an eleven-digit `03…` Pakistani mobile number.
 */
export function normalisePakistaniMobile(input: string): string | null {
  const stripped = input.replace(/[\s\-.()]/g, "");
  const match = MOBILE_PATTERN.exec(stripped);
  if (!match) return null;
  return `+92${match[1]}`;
}

/** `+923001234567` → `03001234567` (what the admin table and CSV show). */
export function formatPhoneLocal(e164: string): string {
  const digits = e164.replace(/^\+92/, "");
  return `0${digits}`;
}

/**
 * Digit-only form of a free-text admin search query, so `"0300 123"`,
 * `"+92 300 123"` and `"300123"` all match the same stored E.164 value
 * (which starts `92…`, never `0…`). Returns `null` when there aren't
 * enough digits to usefully narrow a search (avoids a near-universal
 * regex match on a one- or two-digit query).
 */
export function phoneSearchDigits(query: string): string | null {
  let digits = query.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return digits.length >= 3 ? digits : null;
}

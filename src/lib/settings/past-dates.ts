import type { Field } from "./types";

/**
 * Which "not before today" date fields (027) an admin is trying to set to a day that has already passed.
 *
 * Only a date that CHANGED counts. A window that opened on a past day keeps that stored date, so saving the
 * announcement, the closing date or anything else around it still works; moving a date to an earlier day, or
 * typing a past one, is refused. Clearing a date is always allowed (an empty date means closed).
 *
 * `today` and every date are "YYYY-MM-DD", which compare correctly as strings.
 */
export function changedPastDates(
  fields: readonly Field[],
  incoming: Record<string, unknown>,
  stored: Record<string, unknown>,
  today: string,
): string[] {
  const keys: string[] = [];
  for (const field of fields) {
    if (field.type !== "date" || !field.notBeforeToday) continue;
    const value = typeof incoming[field.key] === "string" ? (incoming[field.key] as string) : "";
    const before = typeof stored[field.key] === "string" ? (stored[field.key] as string) : "";
    if (value !== "" && value !== before && value < today) keys.push(field.key);
  }
  return keys;
}

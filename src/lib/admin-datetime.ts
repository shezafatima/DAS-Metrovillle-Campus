/**
 * Admin date/time formatting — shared by the admin tables for contact (008)
 * and careers applications (012) (research.md §2). Instants (unlike news' calendar-date
 * publishDate), so this stays deliberately separate from
 * src/lib/news/dates.ts.
 */

// Fixed 3-letter month abbreviations, looked up by numeric month rather
// than taken from Intl's locale-formatted "short" month name — ICU's
// en-GB CLDR data renders September as "Sept" (4 letters) on some Node
// builds, which would make the displayed date depend on the runtime's
// bundled ICU version rather than being a stable, testable value.
const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  day: "2-digit",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** `"22 Sep 2026, 14:05"` in Pakistan Standard Time — admin tables and CSV. */
export function formatAdminDateTime(date: Date): string {
  const parts = DATE_TIME_FORMATTER.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const month = MONTH_ABBR[Number(get("month")) - 1];
  return `${get("day")} ${month} ${get("year")}, ${get("hour")}:${get("minute")}`;
}

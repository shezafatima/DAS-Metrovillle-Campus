/**
 * Publish-date handling (research.md §5). `publishDate` is stored as a
 * calendar date — UTC midnight of the chosen day — so admin-browser
 * and server timezones never cause drift. Public visibility compares
 * against "today" in the school's timezone, Asia/Karachi (PKT).
 */

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a "YYYY-MM-DD" input into a UTC-midnight Date. */
export function toUtcMidnight(dateInput: string): Date {
  if (!DATE_INPUT_PATTERN.test(dateInput)) {
    throw new Error(`Invalid date input: ${dateInput}`);
  }
  const [year, month, day] = dateInput.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formats a Date back into "YYYY-MM-DD" (UTC components — the inverse of toUtcMidnight). */
export function toDateInput(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Today's calendar date in Asia/Karachi, as a UTC-midnight Date — the
 * single reference point the public visibility predicate compares
 * `publishDate` against (`src/lib/news/public-queries.ts`).
 */
export function startOfTodayPkt(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD"
  return toUtcMidnight(parts);
}

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** "February 6th, 2023" — the reference site's date format. */
export function formatPostDate(date: Date): string {
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(date);
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${month} ${day}${ordinalSuffix(day)}, ${year}`;
}

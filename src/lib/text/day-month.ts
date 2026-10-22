/**
 * A day and month with no year (014b): the age reference date of Class Levels,
 * stored as "MM-DD". The day must exist in that month in a leap year, so
 * "02-29" is valid and "04-31" is not. English month names are fixed here, so
 * "31 July" reads the same on every server and in every browser.
 */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Days in each month in a leap year. */
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** True for "MM-DD" with a real month and a day that exists in it (29 February counts). */
export function isDayMonth(value: string): boolean {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

/** "07-31" → "31 July". Anything that is not a valid day-month is returned unchanged. */
export function formatDayMonth(value: string): string {
  if (!isDayMonth(value)) return value;
  const [month, day] = value.split("-").map(Number);
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

/**
 * The two parts of a value shaped like "MM-DD" (either part may be missing: "04-" or "-15", a half-chosen date),
 * as the Day and Month selects show them. Anything else splits into empty parts. The parts are not checked
 * against each other: "04-31" splits into month "04" and day "31"; `isDayMonth` says whether it is a real date.
 */
export function splitDayMonth(value: string): { month: string; day: string } {
  const match = /^(\d{2})?-(\d{2})?$/.exec(value);
  return match ? { month: match[1] ?? "", day: match[2] ?? "" } : { month: "", day: "" };
}

/**
 * "MM-DD" from a month and a day, each a number or numeric string. A missing part leaves the other in place
 * ("04-" or "-15"), which is not a real date and so is refused on save; both missing is "".
 */
export function joinDayMonth(month: string | number, day: string | number): string {
  const pad = (part: string | number) => (part === "" ? "" : String(part).padStart(2, "0"));
  const [mm, dd] = [pad(month), pad(day)];
  return mm === "" && dd === "" ? "" : `${mm}-${dd}`;
}

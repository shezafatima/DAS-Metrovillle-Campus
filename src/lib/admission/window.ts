import { settingsCopy } from "@/content/admin";
import { isCalendarDate } from "@/lib/settings/schema";

/**
 * The admission window rule (020 FR-011, FR-013, ADR-0011). Pure: no I/O and
 * no dependence on the process time zone, so the public page, the Settings
 * status line and 013's submit check all get the same answer for the same
 * moment. The request-time wrapper is src/lib/admission/server.ts.
 */

export type AdmissionWindowState =
  | { kind: "open"; closesOn: string }
  | { kind: "upcoming"; opensOn: string }
  | { kind: "closed" };

const KARACHI_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DISPLAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The calendar day of `now` in Pakistan, as "YYYY-MM-DD". */
export function karachiToday(now: Date): string {
  const parts = Object.fromEntries(KARACHI_DAY.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Open from the start of Opens on to the end of Closes on (Pakistan days,
 * inclusive). Closed if either date is empty or not a real date, or if the
 * end is before the start.
 */
export function admissionWindowState(value: { opensOn: string; closesOn: string }, now: Date): AdmissionWindowState {
  const { opensOn, closesOn } = value;
  if (!isCalendarDate(opensOn) || !isCalendarDate(closesOn) || closesOn < opensOn) return { kind: "closed" };
  // Zero-padded ISO dates compare correctly as strings.
  const today = karachiToday(now);
  if (today < opensOn) return { kind: "upcoming", opensOn };
  if (today <= closesOn) return { kind: "open", closesOn };
  return { kind: "closed" };
}

/** "2027-03-31" → "31 March 2027". */
export function formatAdmissionDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return DISPLAY.format(new Date(Date.UTC(year, month - 1, day)));
}

/** The Settings status line: what the public sees right now, in words. */
export function admissionStatusText(state: AdmissionWindowState): string {
  const copy = settingsCopy.admissionStatus;
  switch (state.kind) {
    case "open":
      return copy.open(formatAdmissionDate(state.closesOn));
    case "upcoming":
      return copy.upcoming(formatAdmissionDate(state.opensOn));
    case "closed":
      return copy.closed;
  }
}

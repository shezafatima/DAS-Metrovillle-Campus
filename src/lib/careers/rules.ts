/**
 * Careers write rules (ADR-0008). The only place the reapply window's
 * length is written down: validation, the refusal message, tests and copy
 * all import it.
 */
export const CAREERS_REAPPLY_WINDOW_DAYS = 30;

/**
 * An unfinished upload (a record whose CV was never confirmed) older than
 * this is treated as a crash, not a real recent application: the applicant
 * is asked to try again shortly instead of being told to wait 30 days. The
 * retention sweep removes such records within the hour.
 */
export const STALE_PENDING_MS = 5 * 60 * 1000;

// Pakistan Standard Time is UTC+5 all year (no daylight saving), so the
// calendar day can be computed with plain arithmetic.
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pktDayNumber(instant: Date): number {
  return Math.floor((instant.getTime() + PKT_OFFSET_MS) / DAY_MS);
}

/** The Pakistan calendar date (`YYYY-MM-DD`) of an instant. */
export function pktDateString(instant: Date): string {
  return new Date(pktDayNumber(instant) * DAY_MS).toISOString().slice(0, 10);
}

/**
 * 00:00 Pakistan time of the earliest day that still blocks a new
 * application: an application made on PKT day D blocks through D + 29, and
 * the person may apply again from 00:00 PKT on D + 30.
 */
export function windowStart(now: Date): Date {
  return new Date((pktDayNumber(now) - (CAREERS_REAPPLY_WINDOW_DAYS - 1)) * DAY_MS - PKT_OFFSET_MS);
}

/** The Pakistan calendar date (`YYYY-MM-DD`) on which someone whose last application was `createdAt` may apply again. */
export function reapplyFrom(createdAt: Date): string {
  return new Date((pktDayNumber(createdAt) + CAREERS_REAPPLY_WINDOW_DAYS) * DAY_MS).toISOString().slice(0, 10);
}

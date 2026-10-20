import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { freshReadsForTests } from "@/lib/e2e-fresh-reads";
import { getRegistrationAvailability } from "@/lib/registration/availability";
import { getPublicSettings } from "@/lib/settings/public";
import { admissionWindowState, type AdmissionWindowState } from "./window";

/**
 * The admission window at request time (020, ADR-0011).
 *
 * `connection()` makes every caller render per request, so an "open" or
 * "closed" answer is never cached past midnight Pakistan time. The saved dates
 * still come through the cached Settings reader: only a save changes them, and
 * a save refreshes that cache. Feature 013 reuses getAdmissionWindow() to
 * refuse registrations outside the dates.
 */

export interface AdmissionWindow {
  state: AdmissionWindowState;
  /** "" when not set. */
  announcement: string;
  /** "" when not set. */
  closedMessage: string;
}

/** Test-only: Playwright sets this cookie to an ISO instant to stand in for "now". */
export const E2E_NOW_COOKIE = "e2e-now";

export async function currentTime(): Promise<Date> {
  // Never honoured in production (freshReadsForTests() is false there).
  if (freshReadsForTests()) {
    const value = (await cookies()).get(E2E_NOW_COOKIE)?.value;
    const fake = value ? new Date(value) : null;
    if (fake && !Number.isNaN(fake.getTime())) return fake;
  }
  return new Date();
}

export async function getAdmissionWindow(): Promise<AdmissionWindow> {
  await connection();
  const [saved, now] = await Promise.all([getPublicSettings("admission"), currentTime()]);
  return {
    state: admissionWindowState(saved, now),
    announcement: saved.announcement,
    closedMessage: saved.closedMessage,
  };
}

/**
 * The one switch for the Apply Now button (020 FR-017, FR-018; 013 FR-020):
 * registration is open, meaning the window is open AND the class list is not
 * empty (ADR-0012 amends ADR-0011's second condition). The same answer drives
 * the /admission/register page and the submit route.
 */
export async function isAdmissionApplyOpen(): Promise<boolean> {
  return (await getRegistrationAvailability()).open;
}

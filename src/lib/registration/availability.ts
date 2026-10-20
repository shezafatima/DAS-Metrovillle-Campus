import "server-only";
import { connection } from "next/server";
import { registrationCopy } from "@/content/registration";
import { currentTime } from "@/lib/admission/server";
import { admissionWindowState, karachiToday, type AdmissionWindowState } from "@/lib/admission/window";
import { getPublicSettings } from "@/lib/settings/public";

/**
 * "Is registration open?" (013 research §2, ADR-0012): the admission window is
 * open (020's one window rule) AND at least one class is listed. The page, the
 * submit route and the Apply Now link all ask this one function.
 */
export function registrationOpen(state: AdmissionWindowState, classes: readonly string[]): boolean {
  return state.kind === "open" && classes.length > 0;
}

export interface RegistrationAvailability {
  open: boolean;
  /** The class list, in saved order. Empty when closed for that reason too. */
  classes: string[];
  /** The Settings closed message, or the default line. */
  closedMessage: string;
  /** The Pakistan calendar day, "YYYY-MM-DD" (the age rule and "not in the future" use it). */
  today: string;
  now: Date;
}

/**
 * Per request (`connection()`), from one Settings read and one "now" that
 * honours the test-only e2e-now cookie, so the window, the date and the class
 * list can never disagree with each other.
 */
export async function getRegistrationAvailability(): Promise<RegistrationAvailability> {
  await connection();
  const [saved, now] = await Promise.all([getPublicSettings("admission"), currentTime()]);
  const open = registrationOpen(admissionWindowState(saved, now), saved.classes);
  return {
    open,
    classes: saved.classes,
    closedMessage: saved.closedMessage || registrationCopy.closedDefault,
    today: karachiToday(now),
    now,
  };
}

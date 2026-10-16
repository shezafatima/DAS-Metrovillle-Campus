import { connectDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { logSecurityEvent } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";
import { retentionCutoff } from "@/lib/retention";
import { RegistrationExport } from "@/models/registration-export";
import { StudentRegistration } from "@/models/student-registration";
import { REGISTRATION_DELETE_GRACE_DAYS } from "./rules";

export interface RegistrationSweepCounts {
  expired: number;
  graceEnded: number;
  exports: number;
}

/**
 * Permanent removal (FR-030, ADR-0012). Hard deletes, so a registration's
 * status and restore history go with it. On the raw collections: deleted
 * records must be visible here. Idempotent.
 *   1. older than the retention period (live or deleted)
 *   2. deleted more than REGISTRATION_DELETE_GRACE_DAYS ago
 *   3. export records older than the retention period
 */
export async function sweepRegistrations(
  now: Date = new Date(),
  months: number = getEnv().REGISTRATION_RETENTION_MONTHS,
): Promise<RegistrationSweepCounts> {
  await connectDb();
  const cutoff = retentionCutoff(now, months);
  const graceCutoff = new Date(now.getTime() - REGISTRATION_DELETE_GRACE_DAYS * 86_400_000);

  const expired = await StudentRegistration.collection.deleteMany({ createdAt: { $lt: cutoff } });
  const graceEnded = await StudentRegistration.collection.deleteMany({ deletedAt: { $ne: null, $lt: graceCutoff } });
  const exports = await RegistrationExport.collection.deleteMany({ at: { $lt: cutoff } });
  return { expired: expired.deletedCount, graceEnded: graceEnded.deletedCount, exports: exports.deletedCount };
}

/** The opportunistic sweep, at most once an hour. Never throws; logs the event type only. */
export async function maybeSweepRegistrations(): Promise<RegistrationSweepCounts | null> {
  try {
    const { allowed } = await checkRateLimit({ key: "sweep:registrations", max: 1, windowSeconds: 3600 });
    if (!allowed) return null;
    return await sweepRegistrations();
  } catch {
    logSecurityEvent({ type: "registrations_sweep_failed", outcome: "sweep" });
    return null;
  }
}

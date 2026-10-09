import { connectDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { logSecurityEvent } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDocumentStore, type DocumentStore } from "@/lib/documents/store";
import { CareerApplication } from "@/models/career-application";

/** A pending application (CV never confirmed) is abandoned after this long. */
export const PENDING_ABANDONED_MS = 60 * 60 * 1000;
/** Per run and per kind of work, so one sweep never holds a request open for long. */
const BATCH = 100;

export interface SweepCounts {
  expired: number;
  retriedRemovals: number;
  abandoned: number;
}

/** `now` minus whole calendar months (UTC). */
export function retentionCutoff(now: Date, months: number): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
}

/**
 * Retention and clean-up (contracts/document-store.md, FR-031). Idempotent.
 * A file that cannot be removed leaves its record in place, so the next run
 * tries again: a record is never dropped while its file may still exist.
 *   1. past retention (live or soft-deleted) → delete file → hard-delete record
 *   2. soft-deleted whose file removal failed earlier → delete file → set removedAt
 *   3. pending for over an hour → delete file if present → hard-delete record
 * Works on the raw collection: soft-deleted records must be visible here.
 */
export async function sweepCareerApplications(
  now: Date = new Date(),
  store: DocumentStore = getDocumentStore(),
  months: number = getEnv().CAREERS_RETENTION_MONTHS,
): Promise<SweepCounts> {
  await connectDb();
  const collection = CareerApplication.collection;
  const counts: SweepCounts = { expired: 0, retriedRemovals: 0, abandoned: 0 };

  async function removeFileThenRecord(doc: { _id: unknown; cv?: { key?: string } }): Promise<boolean> {
    try {
      if (doc.cv?.key) await store.delete(doc.cv.key);
      await collection.deleteOne({ _id: doc._id } as never);
      return true;
    } catch {
      logSecurityEvent({ type: "careers_sweep_failed", target: String(doc._id) });
      return false;
    }
  }

  const expired = await collection
    .find({ createdAt: { $lt: retentionCutoff(now, months) } }, { projection: { "cv.key": 1 } })
    .limit(BATCH)
    .toArray();
  for (const doc of expired) if (await removeFileThenRecord(doc)) counts.expired += 1;

  const unremoved = await collection
    .find({ deletedAt: { $ne: null }, "cv.removedAt": null }, { projection: { "cv.key": 1 } })
    .limit(BATCH)
    .toArray();
  for (const doc of unremoved) {
    try {
      if (doc.cv?.key) await store.delete(doc.cv.key);
      await collection.updateOne({ _id: doc._id }, { $set: { "cv.removedAt": now } });
      counts.retriedRemovals += 1;
    } catch {
      logSecurityEvent({ type: "careers_sweep_failed", target: String(doc._id) });
    }
  }

  const abandoned = await collection
    .find(
      { "cv.storedAt": null, deletedAt: null, createdAt: { $lt: new Date(now.getTime() - PENDING_ABANDONED_MS) } },
      { projection: { "cv.key": 1 } },
    )
    .limit(BATCH)
    .toArray();
  for (const doc of abandoned) if (await removeFileThenRecord(doc)) counts.abandoned += 1;

  return counts;
}

/**
 * The opportunistic sweep, at most once an hour across processes. Never
 * throws: a failure is logged and the caller's response is unaffected.
 */
export async function maybeSweepCareers(): Promise<SweepCounts | null> {
  try {
    const { allowed } = await checkRateLimit({ key: "sweep:careers", max: 1, windowSeconds: 3600 });
    if (!allowed) return null;
    return await sweepCareerApplications();
  } catch {
    logSecurityEvent({ type: "careers_sweep_failed", target: "sweep" });
    return null;
  }
}

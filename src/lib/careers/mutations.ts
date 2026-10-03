import type { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { CareerApplication } from "@/models/career-application";
import { DocumentStoreUnavailableError, getDocumentStore, newCvKey, type DocumentStore } from "@/lib/documents/store";
import type { CareerApplicationFields } from "@/lib/validation/career-application";
import { LockBusyError, withIdentityLocks, type LockOptions } from "./identity-lock";
import { reapplyFrom, STALE_PENDING_MS, windowStart } from "./rules";

export { LockBusyError };

/**
 * The one place a career application is written (contracts/document-store.md
 * "Write order", ADR-0008). Under the per-identity locks the reapply window
 * is checked and the record is inserted FIRST as pending (`cv.storedAt:
 * null`); then, after the locks are released, the CV goes to the private
 * store and the record is marked stored. So a refusal happens before any
 * file is written, and a store failure leaves neither a file-less
 * application nor an orphan file.
 */

/** The person applied within the reapply window; `reapplyFrom` is a `YYYY-MM-DD` Pakistan date. */
export class RecentApplicationError extends Error {
  constructor(readonly reapplyFrom: string) {
    super("An application from this email or phone was made recently");
    this.name = "RecentApplicationError";
  }
}

/**
 * The only matches are unfinished uploads that are too old to be a real
 * in-flight request (a crash). Not a recent application, so the applicant
 * is asked to try again shortly, not told to wait; the retention sweep
 * removes such records within the hour.
 */
export class StaleUploadError extends Error {
  constructor() {
    super("An earlier upload from this email or phone did not finish");
    this.name = "StaleUploadError";
  }
}

/**
 * Throws if a non-deleted application (active, or a still-fresh pending
 * one) with the same email OR phone falls inside the reapply window. The
 * soft-delete plugin already excludes deleted records, so deleting an
 * application lets the person apply again at once.
 */
async function assertOutsideReapplyWindow(fields: CareerApplicationFields, now: Date): Promise<void> {
  const matches = await CareerApplication.find({
    $or: [{ email: fields.email }, { phone: fields.phone }],
    createdAt: { $gte: windowStart(now) },
  })
    .select({ createdAt: 1, "cv.storedAt": 1 })
    .sort({ createdAt: -1 })
    .maxTimeMS(5_000)
    .lean();
  if (matches.length === 0) return;

  const isStaleUpload = (match: (typeof matches)[number]) =>
    match.cv?.storedAt == null && now.getTime() - match.createdAt.getTime() > STALE_PENDING_MS;

  const relevant = matches.filter((match) => !isStaleUpload(match));
  if (relevant.length === 0) throw new StaleUploadError();
  // The latest application decides the date, whichever field matched it.
  throw new RecentApplicationError(reapplyFrom(relevant[0].createdAt));
}

/** Best effort: a failed cleanup is retried by the retention sweep (pending records older than an hour). */
async function removePending(id: Types.ObjectId, key: string, store: DocumentStore): Promise<void> {
  await store.delete(key).catch(() => {});
  await CareerApplication.deleteOne({ _id: id }).catch(() => {});
}

export async function createCareerApplication(
  fields: CareerApplicationFields,
  bytes: Uint8Array,
  now: Date = new Date(),
  store: DocumentStore = getDocumentStore(),
  lockOptions?: LockOptions,
): Promise<{ id: string }> {
  await connectDb();
  const key = newCvKey();

  const pending = await withIdentityLocks(
    { email: fields.email, phone: fields.phone },
    async () => {
      await assertOutsideReapplyWindow(fields, now);
      return CareerApplication.create({
        name: fields.name,
        email: fields.email,
        phone: fields.phone,
        qualification: fields.qualification,
        // Set here, never taken from the client: consent was true when we got this far.
        consentAt: now,
        cv: { key, size: bytes.byteLength, storedAt: null, removedAt: null },
      });
    },
    lockOptions,
  );

  try {
    await store.put(key, bytes, "application/pdf");
  } catch {
    await removePending(pending._id, key, store);
    throw new DocumentStoreUnavailableError();
  }

  try {
    await CareerApplication.updateOne({ _id: pending._id }, { $set: { "cv.storedAt": new Date() } });
  } catch {
    await removePending(pending._id, key, store);
    throw new DocumentStoreUnavailableError();
  }

  return { id: pending._id.toString() };
}

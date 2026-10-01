import { connectDb } from "@/lib/db";
import { AdminNotificationState } from "@/models/admin-notification-state";

/**
 * Lazily creates the admin's notification state on first read, with
 * `signupsLastOpenedAt` defaulted to *now* — never the epoch — so
 * pre-existing signups never flood in as new the day this feature
 * ships (research.md §1; ADR-0002). A single atomic upsert with
 * `$setOnInsert` (rather than find-then-create) so two concurrent
 * first reads for the same admin — e.g. two tabs polling at once —
 * can never race into a duplicate-key error or overwrite each other.
 */
export async function getSignupsLastOpenedAt(adminId: string): Promise<Date> {
  await connectDb();
  const doc = await AdminNotificationState.findOneAndUpdate(
    { _id: adminId },
    { $setOnInsert: { signupsLastOpenedAt: new Date() } },
    { upsert: true, returnDocument: "after" },
  );
  return doc.signupsLastOpenedAt;
}

/** Advances the admin's "last opened Signups" moment (upsert). */
export async function markSignupsOpened(adminId: string, now: Date = new Date()): Promise<Date> {
  await connectDb();
  await AdminNotificationState.findByIdAndUpdate(
    adminId,
    { signupsLastOpenedAt: now },
    { upsert: true, returnDocument: "after" },
  );
  return now;
}

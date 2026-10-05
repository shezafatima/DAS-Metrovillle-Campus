import { connectDb } from "@/lib/db";
import { AdminNotificationState } from "@/models/admin-notification-state";

/**
 * Reads the admin's "last opened Applications" moment, creating it on first
 * read. It defaults to *now*, never the epoch, so applications that existed
 * before an admin's first visit never flood in as new (ADR-0002), including
 * for an existing admin document that only has the old signups field: the
 * pipeline fills `careersLastOpenedAt` only when it is missing. One atomic
 * upsert (not find-then-create), so two concurrent first reads for the same
 * admin, such as two tabs polling at once, can never race into a
 * duplicate-key error or overwrite each other.
 */
export async function getCareersLastOpenedAt(adminId: string): Promise<Date> {
  await connectDb();
  const doc = await AdminNotificationState.collection.findOneAndUpdate(
    { _id: adminId as never },
    [{ $set: { careersLastOpenedAt: { $ifNull: ["$careersLastOpenedAt", new Date()] } } }],
    { upsert: true, returnDocument: "after" },
  );
  return (doc as unknown as { careersLastOpenedAt: Date }).careersLastOpenedAt;
}

/** Advances the admin's "last opened Applications" moment (upsert). */
export async function markCareersOpened(adminId: string, now: Date = new Date()): Promise<Date> {
  await connectDb();
  await AdminNotificationState.findByIdAndUpdate(
    adminId,
    { careersLastOpenedAt: now },
    { upsert: true, returnDocument: "after" },
  );
  return now;
}

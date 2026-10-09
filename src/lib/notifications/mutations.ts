import { connectDb } from "@/lib/db";
import { Message } from "@/models/message";
import { markCareersOpened } from "@/lib/notifications/state";
import { canAccess } from "@/lib/permissions";
import type { NotificationViewer } from "@/lib/notifications/types";

/**
 * "Mark all as read" — moves every currently-new message to read and
 * advances the admin's "last opened Applications" moment to now. Never
 * touches a message already "read" or "responded", and never changes
 * or deletes any application record (spec Assumptions).
 *
 * 011: only the kinds the viewer may see are touched. A content manager
 * without `messages` cannot change message statuses through the bell, and
 * one without `careers` does not move their applications marker.
 */
export async function markAllNotificationsRead(viewer: NotificationViewer, now: Date = new Date()): Promise<void> {
  await connectDb();
  await Promise.all([
    canAccess(viewer, "messages")
      ? Message.updateMany({ status: "new" }, { $set: { status: "read", statusChangedAt: now } })
      : undefined,
    canAccess(viewer, "careers") ? markCareersOpened(viewer.userId, now) : undefined,
  ]);
}

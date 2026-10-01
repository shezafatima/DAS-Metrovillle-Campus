import { connectDb } from "@/lib/db";
import { Message, type MessageDoc } from "@/models/message";
import { Signup, type SignupDoc } from "@/models/signup";
import { countNewMessages } from "@/lib/messages/admin-queries";
import { getSignupsLastOpenedAt } from "@/lib/notifications/state";
import { canAccess } from "@/lib/permissions";
import type { NotificationItem, NotificationViewer, NotificationsSummary } from "@/lib/notifications/types";

const ITEM_LIMIT = 10;

/** A signup counts as new when it arrived, or was updated by a repeat submission, after the admin's last Signups visit (research.md §2). */
export async function countNewSignups(adminId: string): Promise<number> {
  await connectDb();
  const lastOpened = await getSignupsLastOpenedAt(adminId);
  return Signup.countDocuments({ lastSignupAt: { $gt: lastOpened } });
}

function messageToItem(doc: Pick<MessageDoc, "_id" | "name" | "subject" | "createdAt">): NotificationItem {
  return {
    kind: "message",
    id: doc._id.toString(),
    title: doc.name,
    description: doc.subject,
    timestamp: doc.createdAt!.toISOString(),
    href: `/admin/messages/${doc._id.toString()}`,
  };
}

function signupToItem(doc: Pick<SignupDoc, "_id" | "name" | "email" | "lastSignupAt">): NotificationItem {
  return {
    kind: "signup",
    id: doc._id.toString(),
    title: doc.name,
    description: doc.email,
    timestamp: doc.lastSignupAt.toISOString(),
    href: "/admin/signups",
  };
}

/** Which kinds a viewer may see (011). Both by default, for callers that already checked. */
export interface NotificationKinds {
  messages: boolean;
  signups: boolean;
}

const ALL_KINDS: NotificationKinds = { messages: true, signups: true };

function kindsFor(viewer: NotificationViewer): NotificationKinds {
  return { messages: canAccess(viewer, "messages"), signups: canAccess(viewer, "careers") };
}

/** Up to `limit` newest items across the permitted kinds, mixed and re-sorted by arrival time (research.md §2). */
export async function listNotificationItems(
  adminId: string,
  limit: number = ITEM_LIMIT,
  kinds: NotificationKinds = ALL_KINDS,
): Promise<NotificationItem[]> {
  if (!kinds.messages && !kinds.signups) return [];
  await connectDb();
  const lastOpened = kinds.signups ? await getSignupsLastOpenedAt(adminId) : new Date(0);

  const [messages, signups] = await Promise.all([
    kinds.messages
      ? Message.find({ status: "new" })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select({ name: 1, subject: 1, createdAt: 1 })
          .lean()
      : [],
    kinds.signups
      ? Signup.find({ lastSignupAt: { $gt: lastOpened } })
          .sort({ lastSignupAt: -1 })
          .limit(limit)
          .select({ name: 1, email: 1, lastSignupAt: 1 })
          .lean()
      : [],
  ]);

  const items = [
    ...(messages as unknown as MessageDoc[]).map(messageToItem),
    ...(signups as unknown as SignupDoc[]).map(signupToItem),
  ];

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, limit);
}

/**
 * Backs both the polling endpoint and the layout's SSR seed — one code path for every "new" number (spec FR-014).
 * Only the kinds the viewer's permissions allow are queried, so nothing else is counted or leaked (011 FR-010).
 */
export async function getNotificationsSummary(viewer: NotificationViewer): Promise<NotificationsSummary> {
  const kinds = kindsFor(viewer);
  const [messagesNew, signupsNew, items] = await Promise.all([
    kinds.messages ? countNewMessages() : 0,
    kinds.signups ? countNewSignups(viewer.userId) : 0,
    listNotificationItems(viewer.userId, ITEM_LIMIT, kinds),
  ]);
  return { messagesNew, signupsNew, items };
}

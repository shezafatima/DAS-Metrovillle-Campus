import { connectDb } from "@/lib/db";
import { Message, type MessageDoc } from "@/models/message";
import { CareerApplication, type CareerApplicationDoc } from "@/models/career-application";
import { countNewMessages } from "@/lib/messages/admin-queries";
import { buildApplicationsFilter } from "@/lib/careers/admin-queries";
import { getCareersLastOpenedAt } from "@/lib/notifications/state";
import { canAccess } from "@/lib/permissions";
import type { NotificationItem, NotificationViewer, NotificationsSummary } from "@/lib/notifications/types";

const ITEM_LIMIT = 10;

/**
 * An application counts as new when it arrived after the admin's last
 * Applications visit. Applications are never edited, so there is no
 * "updated again" case (unlike the signups this replaces). Only stored,
 * live applications count: the shared admin filter hides pending and
 * deleted ones.
 */
export async function countNewApplications(adminId: string): Promise<number> {
  await connectDb();
  const lastOpened = await getCareersLastOpenedAt(adminId);
  return CareerApplication.countDocuments({ ...buildApplicationsFilter(), createdAt: { $gt: lastOpened } });
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

function applicationToItem(
  doc: Pick<CareerApplicationDoc, "_id" | "name" | "qualification" | "createdAt">,
): NotificationItem {
  return {
    kind: "application",
    id: doc._id.toString(),
    title: doc.name,
    description: doc.qualification,
    timestamp: doc.createdAt!.toISOString(),
    href: `/admin/careers/${doc._id.toString()}`,
  };
}

/** Which kinds a viewer may see (011). Both by default, for callers that already checked. */
export interface NotificationKinds {
  messages: boolean;
  applications: boolean;
}

const ALL_KINDS: NotificationKinds = { messages: true, applications: true };

function kindsFor(viewer: NotificationViewer): NotificationKinds {
  return { messages: canAccess(viewer, "messages"), applications: canAccess(viewer, "careers") };
}

/** Up to `limit` newest items across the permitted kinds, mixed and re-sorted by arrival time (research.md §2). */
export async function listNotificationItems(
  adminId: string,
  limit: number = ITEM_LIMIT,
  kinds: NotificationKinds = ALL_KINDS,
): Promise<NotificationItem[]> {
  if (!kinds.messages && !kinds.applications) return [];
  await connectDb();
  const lastOpened = kinds.applications ? await getCareersLastOpenedAt(adminId) : new Date(0);

  const [messages, applications] = await Promise.all([
    kinds.messages
      ? Message.find({ status: "new" })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select({ name: 1, subject: 1, createdAt: 1 })
          .lean()
      : [],
    kinds.applications
      ? CareerApplication.find({ ...buildApplicationsFilter(), createdAt: { $gt: lastOpened } })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select({ name: 1, qualification: 1, createdAt: 1 })
          .lean()
      : [],
  ]);

  const items = [
    ...(messages as unknown as MessageDoc[]).map(messageToItem),
    ...(applications as unknown as CareerApplicationDoc[]).map(applicationToItem),
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
  const [messagesNew, applicationsNew, items] = await Promise.all([
    kinds.messages ? countNewMessages() : 0,
    kinds.applications ? countNewApplications(viewer.userId) : 0,
    listNotificationItems(viewer.userId, ITEM_LIMIT, kinds),
  ]);
  return { messagesNew, applicationsNew, items };
}

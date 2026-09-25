import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { Message, type MessageDoc } from "@/models/message";
import { type Paged, ADMIN_PAGE_SIZE, escapeRegExp } from "@/lib/admin-list";
import { formatPhoneLocal } from "@/lib/phone";
import { toPreview } from "@/lib/messages/preview";
import { isMessageStatus, type MessageStatus } from "@/lib/messages/statuses";

export interface MessageRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  preview: string;
  status: MessageStatus;
  receivedAt: string; // ISO
}

export interface MessageDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phoneDisplay: string | null;
  subject: string;
  body: string;
  status: MessageStatus;
  receivedAt: string; // ISO
  statusChangedAt: string | null; // ISO
}

function toMessageRow(doc: MessageDoc): MessageRow {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    subject: doc.subject,
    preview: toPreview(doc.body),
    status: doc.status as MessageStatus,
    receivedAt: doc.createdAt!.toISOString(),
  };
}

export interface ListMessagesOptions {
  q?: string;
  status?: string;
  page?: number;
}

/** Shared by listMessages so filter-building stays in one place. */
export function buildFilter(options: { q?: string; status?: string }): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const q = options.q?.trim();
  if (q) {
    const rx = new RegExp(escapeRegExp(q), "i");
    filter.$or = [{ name: rx }, { email: rx }, { subject: rx }];
  }

  if (options.status && isMessageStatus(options.status)) {
    filter.status = options.status;
  }

  return filter;
}

/** The admin inbox query (FR-011–FR-014). */
export async function listMessages(options: ListMessagesOptions = {}): Promise<Paged<MessageRow>> {
  await connectDb();
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const filter = buildFilter(options);

  const total = await Message.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const docs = await Message.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE)
    .lean();

  return {
    items: (docs as unknown as MessageDoc[]).map(toMessageRow),
    page,
    pageSize: ADMIN_PAGE_SIZE,
    total,
    totalPages,
  };
}

/** The detail page's single-message read. `null` = malformed, unknown or deleted. */
export async function getMessage(id: string): Promise<MessageDetail | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const doc = await Message.findById(id).lean();
  if (!doc) return null;
  const message = doc as unknown as MessageDoc;
  return {
    id: message._id.toString(),
    name: message.name,
    email: message.email,
    phone: message.phone ?? null,
    phoneDisplay: message.phone ? formatPhoneLocal(message.phone) : null,
    subject: message.subject,
    body: message.body,
    status: message.status as MessageStatus,
    receivedAt: message.createdAt!.toISOString(),
    statusChangedAt: message.statusChangedAt ? message.statusChangedAt.toISOString() : null,
  };
}

/** Sidebar badge count (FR-020a). */
export async function countNewMessages(): Promise<number> {
  await connectDb();
  return Message.countDocuments({ status: "new" });
}

/** Overview card counts (FR-020). */
export async function countMessages(): Promise<{ total: number; new: number }> {
  await connectDb();
  const [total, newCount] = await Promise.all([
    Message.countDocuments({}),
    Message.countDocuments({ status: "new" }),
  ]);
  return { total, new: newCount };
}

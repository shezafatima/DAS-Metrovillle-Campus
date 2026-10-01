import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { Message } from "@/models/message";
import type { MessageInput } from "@/lib/validation/message";
import type { MessageStatus } from "@/lib/messages/statuses";

/**
 * The append-only write path for contact messages (ADR-0001's "Boundary"
 * — this rule does NOT extend to messages the way it does to signups).
 * It must never upsert, look up by email, or pass `withDeleted`.
 */

export async function createMessage(input: MessageInput): Promise<{ id: string }> {
  await connectDb();
  const doc = await Message.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    subject: input.subject,
    body: input.message,
    status: "new",
    statusChangedAt: null,
  });
  return { id: doc._id.toString() };
}

/**
 * Conditional "opened" transition: `new → read` only. Returns `null`
 * for a malformed/unknown/deleted id, otherwise the resulting status
 * and whether this call actually changed it (data-model.md "Write
 * paths").
 */
export async function markMessageRead(
  id: string,
): Promise<{ id: string; status: MessageStatus; changed: boolean } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();

  const updated = await Message.findOneAndUpdate(
    { _id: id, status: "new" },
    { $set: { status: "read", statusChangedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (updated) {
    return { id, status: updated.status as MessageStatus, changed: true };
  }

  const existing = await Message.findById(id);
  if (!existing) return null;
  return { id, status: existing.status as MessageStatus, changed: false };
}

export async function setMessageStatus(
  id: string,
  status: MessageStatus,
): Promise<{ id: string; status: MessageStatus; statusChangedAt: string } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();

  const now = new Date();
  const updated = await Message.findOneAndUpdate(
    { _id: id },
    { $set: { status, statusChangedAt: now } },
    { returnDocument: "after" },
  );
  if (!updated) return null;
  return { id, status: updated.status as MessageStatus, statusChangedAt: now.toISOString() };
}

export async function deleteMessage(id: string): Promise<{ id: string } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const result = await Message.softDeleteById(id);
  return result ? { id } : null;
}

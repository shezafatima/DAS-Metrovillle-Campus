// @vitest-environment node
import { expect, it } from "vitest";
import mongoose from "mongoose";
import { describeWithDb } from "@/test/db";
import { createMessage, markMessageRead, setMessageStatus, deleteMessage } from "@/lib/messages/mutations";
import type { MessageInput } from "@/lib/validation/message";
import { Message } from "@/models/message";

function input(overrides: Partial<MessageInput> = {}): MessageInput {
  return {
    name: "Ali Khan",
    email: "ali@example.com",
    phone: null,
    subject: "Admission",
    message: "Hello there.",
    ...overrides,
  };
}

describeWithDb("messages mutations", ["messages"], () => {
  it("createMessage stores status new, statusChangedAt null, phone null and body from input.message", async () => {
    const { id } = await createMessage(input());
    const doc = await Message.findById(id);
    expect(doc!.status).toBe("new");
    expect(doc!.statusChangedAt).toBeNull();
    expect(doc!.phone).toBeNull();
    expect(doc!.body).toBe("Hello there.");
  });

  it("two calls with the same email and different subjects create two documents", async () => {
    await createMessage(input({ subject: "First" }));
    await createMessage(input({ subject: "Second" }));
    const count = await Message.countDocuments({ email: "ali@example.com" });
    expect(count).toBe(2);
  });

  it("two calls with an identical payload create two documents", async () => {
    await createMessage(input());
    await createMessage(input());
    const count = await Message.countDocuments({ email: "ali@example.com" });
    expect(count).toBe(2);
  });

  it("markMessageRead on a new message marks it read and sets statusChangedAt", async () => {
    const { id } = await createMessage(input());
    const result = await markMessageRead(id);
    expect(result).toEqual({ id, status: "read", changed: true });
    const doc = await Message.findById(id);
    expect(doc!.statusChangedAt).not.toBeNull();
  });

  it("markMessageRead called again returns changed: false", async () => {
    const { id } = await createMessage(input());
    await markMessageRead(id);
    const second = await markMessageRead(id);
    expect(second).toEqual({ id, status: "read", changed: false });
  });

  it("markMessageRead on a responded message is unchanged", async () => {
    const { id } = await createMessage(input());
    await setMessageStatus(id, "responded");
    const result = await markMessageRead(id);
    expect(result).toEqual({ id, status: "responded", changed: false });
  });

  it("markMessageRead on a deleted or unknown id returns null", async () => {
    const { id } = await createMessage(input());
    await deleteMessage(id);
    await expect(markMessageRead(id)).resolves.toBeNull();
    const unknownId = new mongoose.Types.ObjectId().toString();
    await expect(markMessageRead(unknownId)).resolves.toBeNull();
  });

  it("ten concurrent markMessageRead calls produce exactly one changed: true", async () => {
    const { id } = await createMessage(input());
    const results = await Promise.all(Array.from({ length: 10 }, () => markMessageRead(id)));
    const changedCount = results.filter((r) => r?.changed).length;
    expect(changedCount).toBe(1);
  });

  it("setMessageStatus cycles read -> responded -> new -> read with increasing statusChangedAt", async () => {
    const { id } = await createMessage(input());
    const r1 = await setMessageStatus(id, "read");
    const r2 = await setMessageStatus(id, "responded");
    const r3 = await setMessageStatus(id, "new");
    const r4 = await setMessageStatus(id, "read");
    expect([r1, r2, r3, r4].every((r) => r !== null)).toBe(true);
    const times = [r1, r2, r3, r4].map((r) => new Date(r!.statusChangedAt).getTime());
    expect(times[1]).toBeGreaterThanOrEqual(times[0]);
    expect(times[2]).toBeGreaterThanOrEqual(times[1]);
    expect(times[3]).toBeGreaterThanOrEqual(times[2]);
  });

  it("setMessageStatus on a deleted id returns null", async () => {
    const { id } = await createMessage(input());
    await deleteMessage(id);
    await expect(setMessageStatus(id, "read")).resolves.toBeNull();
  });

  it("last write wins: responded then new leaves the document at new", async () => {
    const { id } = await createMessage(input());
    await setMessageStatus(id, "responded");
    const final = await setMessageStatus(id, "new");
    expect(final!.status).toBe("new");
    const doc = await Message.findById(id);
    expect(doc!.status).toBe("new");
  });

  it("deleteMessage sets deletedAt; a second call returns null; a malformed id returns null", async () => {
    const { id } = await createMessage(input());
    const result = await deleteMessage(id);
    expect(result).toEqual({ id });
    const doc = await Message.findById(id).setOptions({ withDeleted: true });
    expect(doc!.deletedAt).not.toBeNull();

    await expect(deleteMessage(id)).resolves.toBeNull();
    await expect(deleteMessage("not-an-id")).resolves.toBeNull();
  });

  it("after a delete, markMessageRead and setMessageStatus both return null", async () => {
    const { id } = await createMessage(input());
    await deleteMessage(id);
    await expect(markMessageRead(id)).resolves.toBeNull();
    await expect(setMessageStatus(id, "read")).resolves.toBeNull();
  });
});

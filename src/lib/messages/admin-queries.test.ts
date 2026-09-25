// @vitest-environment node
import { expect, it } from "vitest";
import mongoose from "mongoose";
import { describeWithDb } from "@/test/db";
import { Message } from "@/models/message";
import { listMessages, getMessage, countMessages, countNewMessages } from "@/lib/messages/admin-queries";

async function seed(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return Message.create({
    name: "Person",
    email: `person-${Math.random().toString(36).slice(2)}@example.com`,
    phone: null,
    subject: "Enquiry",
    body: "Body text.",
    status: "new",
    statusChangedAt: null,
    createdAt: now,
    ...overrides,
  });
}

describeWithDb("listMessages", ["messages"], () => {
  it("orders by createdAt, newest first", async () => {
    await seed({ name: "Older", createdAt: new Date("2026-01-01T00:00:00Z") });
    await seed({ name: "Newer", createdAt: new Date("2026-06-01T00:00:00Z") });
    const result = await listMessages();
    expect(result.items[0]!.name).toBe("Newer");
    expect(result.items[1]!.name).toBe("Older");
  });

  it("paginates 45 records into 20 + 20 + 5", async () => {
    for (let i = 0; i < 45; i++) {
      await seed({ createdAt: new Date(Date.UTC(2026, 0, i + 1)) });
    }
    const page3 = await listMessages({ page: 3 });
    expect(page3.totalPages).toBe(3);
    expect(page3.items).toHaveLength(5);
  });

  it("matches part of a name, email (case-insensitive) and subject", async () => {
    await seed({ name: "Ali Khan", email: "match-khan@example.com", subject: "Fees" });
    await seed({ name: "Sara Ahmed", email: "no-match@example.com", subject: "Admission" });
    expect((await listMessages({ q: "khan" })).items).toHaveLength(1);
    expect((await listMessages({ q: "MATCH-khan@ex" })).items).toHaveLength(1);
    expect((await listMessages({ q: "fees" })).items).toHaveLength(1);
  });

  it("matches an Urdu subject", async () => {
    await seed({ subject: "داخلہ", email: "urdu@example.com" });
    const result = await listMessages({ q: "داخلہ" });
    expect(result.items).toHaveLength(1);
  });

  it("escapes regex metacharacters in q", async () => {
    await seed({ name: "a.b", email: "dotb@example.com" });
    await seed({ name: "axb", email: "axb@example.com" });
    const result = await listMessages({ q: "a.b" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.email).toBe("dotb@example.com");
  });

  it("filters by status; an unknown status returns all", async () => {
    await seed({ status: "read", email: "read@example.com" });
    await seed({ status: "new", email: "new@example.com" });
    const readOnly = await listMessages({ status: "read" });
    expect(readOnly.items.every((i) => i.status === "read")).toBe(true);
    const all = await listMessages();
    const bogus = await listMessages({ status: "bogus" });
    expect(bogus.total).toBe(all.total);
  });

  it("combines q and status", async () => {
    await seed({ name: "Ali Khan", status: "read", email: "combo1@example.com" });
    await seed({ name: "Ali Khan", status: "new", email: "combo2@example.com" });
    const result = await listMessages({ q: "khan", status: "read" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.email).toBe("combo1@example.com");
  });

  it("excludes a soft-deleted message from the list and from getMessage", async () => {
    const doc = await seed({ email: "deleted@example.com" });
    await Message.softDeleteById(doc._id);
    const list = await listMessages();
    expect(list.items.some((i) => i.email === "deleted@example.com")).toBe(false);
    expect(await getMessage(doc._id.toString())).toBeNull();
  });

  it("the preview is at most 101 code points and never contains a newline", async () => {
    await seed({ body: "x\n".repeat(200), email: "long@example.com" });
    const result = await listMessages({ q: "long@ex" });
    expect(result.items[0]!.preview.includes("\n")).toBe(false);
    expect(Array.from(result.items[0]!.preview).length).toBeLessThanOrEqual(101);
  });

  it("getMessage returns null for a malformed id", async () => {
    await expect(getMessage("not-an-id")).resolves.toBeNull();
  });

  it("getMessage keeps body line breaks and returns null phone/phoneDisplay when absent", async () => {
    const doc = await seed({ body: "line one\nline two", phone: null });
    const detail = await getMessage(doc._id.toString());
    expect(detail!.body).toBe("line one\nline two");
    expect(detail!.phone).toBeNull();
    expect(detail!.phoneDisplay).toBeNull();
  });

  it("SC-007: finds a message among 200 by part of its subject in under 1000ms", async () => {
    const seeds = Array.from({ length: 200 }, (_, i) => ({
      name: `Person ${i}`,
      email: `person-${i}@example.com`,
      phone: null,
      subject: i === 100 ? "Very specific subject line" : `Subject ${i}`,
      body: "Body.",
      status: "new",
      statusChangedAt: null,
      createdAt: new Date(),
    }));
    await Message.insertMany(seeds);

    await listMessages({ q: "warmup" });

    const start = performance.now();
    const result = await listMessages({ q: "specific subject" });
    const elapsed = performance.now() - start;
    console.log(`[SC-007] listMessages search over 200 docs took ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(1000);
    expect(result.items.some((i) => i.subject === "Very specific subject line")).toBe(true);
  });
});

describeWithDb("countMessages / countNewMessages", ["messages"], () => {
  it("counts total and new, excluding deleted", async () => {
    await seed({ status: "new" });
    await seed({ status: "new" });
    await seed({ status: "read" });
    await seed({ status: "responded" });
    const deleted = await seed({ status: "new" });
    await Message.softDeleteById(deleted._id);

    expect(await countNewMessages()).toBe(2);
    expect(await countMessages()).toEqual({ total: 4, new: 2 });
  });
});

describeWithDb("getMessage id handling", ["messages"], () => {
  it("returns null for a well-formed but unknown id", async () => {
    const unknownId = new mongoose.Types.ObjectId().toString();
    await expect(getMessage(unknownId)).resolves.toBeNull();
  });
});

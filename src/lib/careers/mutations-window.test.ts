// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { createFakeDocumentStore, type FakeDocumentStore } from "@/test/fake-document-store";
import { CareerApplication } from "@/models/career-application";
import { CareerApplicationLock } from "@/models/career-application-lock";
import { lockKey } from "./identity-lock";
import { LockBusyError, RecentApplicationError, StaleUploadError, createCareerApplication } from "./mutations";
import { reapplyFrom } from "./rules";
import type { CareerApplicationFields } from "@/lib/validation/career-application";

// 30-day reapply window and per-identity locks (ADR-0008, US2).
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const FIELDS: CareerApplicationFields = {
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  phone: "+923001234567",
  qualification: "M.Ed",
  consent: true,
};
const SECOND = { email: "second@example.com", phone: "+923007654321" };
const PDF = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
const DAY_MS = 24 * 60 * 60 * 1000;

/** Inserts an application directly, so `createdAt` and the pending state can be set exactly. */
async function rawApplication(overrides: {
  email: string;
  phone: string;
  createdAt: Date;
  storedAt?: Date | null;
}) {
  const result = await CareerApplication.collection.insertOne({
    name: "Earlier Applicant",
    email: overrides.email,
    phone: overrides.phone,
    qualification: "BA",
    consentAt: overrides.createdAt,
    cv: {
      key: `cv/${"a".repeat(43)}.pdf`,
      size: 10,
      storedAt: overrides.storedAt === undefined ? overrides.createdAt : overrides.storedAt,
      removedAt: null,
    },
    deletedAt: null,
    createdAt: overrides.createdAt,
    updatedAt: overrides.createdAt,
  });
  return result.insertedId;
}

describeWithDb("createCareerApplication: 30-day reapply window", ["careerApplications", "careerApplicationLocks"], () => {
  let store: FakeDocumentStore;

  beforeEach(() => {
    store = createFakeDocumentStore();
  });

  it("refuses the same email within the window, with the date the person may apply again, and writes no file", async () => {
    const first = await createCareerApplication(FIELDS, PDF, new Date(), store);
    const firstDoc = (await CareerApplication.findById(first.id).lean())!;

    const attempt = createCareerApplication({ ...FIELDS, ...SECOND, email: FIELDS.email }, PDF, new Date(), store);
    await expect(attempt).rejects.toBeInstanceOf(RecentApplicationError);
    await expect(attempt).rejects.toMatchObject({ reapplyFrom: reapplyFrom(firstDoc.createdAt) });

    expect(store.keys()).toHaveLength(1); // only the first application's file
    expect(await CareerApplication.countDocuments({})).toBe(1);
  });

  it("refuses the same phone within the window in exactly the same way", async () => {
    const first = await createCareerApplication(FIELDS, PDF, new Date(), store);
    const firstDoc = (await CareerApplication.findById(first.id).lean())!;

    const attempt = createCareerApplication({ ...FIELDS, ...SECOND, phone: FIELDS.phone }, PDF, new Date(), store);
    await expect(attempt).rejects.toBeInstanceOf(RecentApplicationError);
    await expect(attempt).rejects.toMatchObject({ reapplyFrom: reapplyFrom(firstDoc.createdAt) });
    expect(store.keys()).toHaveLength(1);
  });

  it("never changes the stored application when it refuses a repeat", async () => {
    const first = await createCareerApplication(FIELDS, PDF, new Date(), store);
    const before = await CareerApplication.findById(first.id).lean();

    await expect(
      createCareerApplication({ ...FIELDS, name: "Someone Else", qualification: "PhD" }, PDF, new Date(), store),
    ).rejects.toBeInstanceOf(RecentApplicationError);

    expect(await CareerApplication.findById(first.id).lean()).toEqual(before);
  });

  it("uses the later date when the email matches one application and the phone matches a later one", async () => {
    const now = new Date();
    await rawApplication({ email: "a@example.com", phone: "+923001111111", createdAt: new Date(now.getTime() - 10 * DAY_MS) });
    const laterAt = new Date(now.getTime() - 2 * DAY_MS);
    await rawApplication({ email: "b@example.com", phone: "+923002222222", createdAt: laterAt });

    await expect(
      createCareerApplication({ ...FIELDS, email: "a@example.com", phone: "+923002222222" }, PDF, now, store),
    ).rejects.toMatchObject({ reapplyFrom: reapplyFrom(laterAt) });
  });

  it("does not count a soft-deleted application, so a deleted person can apply again at once", async () => {
    const first = await createCareerApplication(FIELDS, PDF, new Date(), store);
    await CareerApplication.softDeleteById(first.id);

    const again = await createCareerApplication(FIELDS, PDF, new Date(), store);
    expect(again.id).not.toBe(first.id);
    expect(await CareerApplication.countDocuments({})).toBe(1);
  });

  it("counts an unfinished (pending) application that is still fresh", async () => {
    const createdAt = new Date(Date.now() - 60_000); // one minute old: a real in-flight upload
    await rawApplication({ ...SECOND, createdAt, storedAt: null });

    await expect(createCareerApplication({ ...FIELDS, ...SECOND }, PDF, new Date(), store)).rejects.toMatchObject({
      reapplyFrom: reapplyFrom(createdAt),
    });
  });

  it("asks to try again, not to wait, when the only match is a stale unfinished upload", async () => {
    await rawApplication({ ...SECOND, createdAt: new Date(Date.now() - 10 * 60_000), storedAt: null });

    await expect(createCareerApplication({ ...FIELDS, ...SECOND }, PDF, new Date(), store)).rejects.toBeInstanceOf(
      StaleUploadError,
    );
    expect(store.keys()).toEqual([]);
  });

  it("still refuses on a real recent application even when a stale unfinished one also matches", async () => {
    const recentAt = new Date(Date.now() - DAY_MS);
    await rawApplication({
      email: SECOND.email,
      phone: "+923003333333",
      createdAt: new Date(Date.now() - 20 * 60_000),
      storedAt: null,
    });
    await rawApplication({ email: "x@example.com", phone: SECOND.phone, createdAt: recentAt });

    await expect(createCareerApplication({ ...FIELDS, ...SECOND }, PDF, new Date(), store)).rejects.toMatchObject({
      reapplyFrom: reapplyFrom(recentAt),
    });
  });

  it("still refuses 29 days after the earlier application", async () => {
    const now = new Date();
    await rawApplication({ ...SECOND, createdAt: new Date(now.getTime() - 29 * DAY_MS) });
    await expect(createCareerApplication({ ...FIELDS, ...SECOND }, PDF, now, store)).rejects.toBeInstanceOf(
      RecentApplicationError,
    );
  });

  it("accepts a new application 30 days after the earlier one and leaves the earlier one unchanged", async () => {
    const now = new Date();
    const earlierId = await rawApplication({ ...SECOND, createdAt: new Date(now.getTime() - 30 * DAY_MS) });
    const before = await CareerApplication.collection.findOne({ _id: earlierId });

    const again = await createCareerApplication({ ...FIELDS, ...SECOND }, PDF, now, store);

    expect(again.id).not.toBe(earlierId.toString());
    expect(await CareerApplication.countDocuments({})).toBe(2);
    expect(await CareerApplication.collection.findOne({ _id: earlierId })).toEqual(before);
  });

  it("lets exactly one of 10 simultaneous submissions sharing an email through", async () => {
    const attempts = Array.from({ length: 10 }, (_, i) =>
      createCareerApplication({ ...FIELDS, phone: `+92300100000${i}` }, PDF, new Date(), store, {
        waitMs: 20_000,
        retryMs: 50,
      }),
    );
    const results = await Promise.allSettled(attempts);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const failure of results.filter((r): r is PromiseRejectedResult => r.status === "rejected")) {
      expect(failure.reason).toBeInstanceOf(RecentApplicationError);
    }
    expect(await CareerApplication.countDocuments({ email: FIELDS.email })).toBe(1);
    expect(store.keys()).toHaveLength(1);
  });

  it("lets exactly one of 10 simultaneous submissions sharing only a phone through", async () => {
    const attempts = Array.from({ length: 10 }, (_, i) =>
      createCareerApplication({ ...FIELDS, email: `person${i}@example.com` }, PDF, new Date(), store, {
        waitMs: 20_000,
        retryMs: 50,
      }),
    );
    const results = await Promise.allSettled(attempts);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await CareerApplication.countDocuments({ phone: FIELDS.phone })).toBe(1);
    expect(store.keys()).toHaveLength(1);
  });

  it("gives up with LockBusyError when the identity lock stays held, and saves nothing", async () => {
    await CareerApplicationLock.collection.insertOne({
      _id: lockKey("email", FIELDS.email) as never,
      owner: "another-request",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      createCareerApplication(FIELDS, PDF, new Date(), store, { waitMs: 500, retryMs: 50 }),
    ).rejects.toBeInstanceOf(LockBusyError);
    expect(await CareerApplication.countDocuments({})).toBe(0);
    expect(store.keys()).toEqual([]);
  });
});

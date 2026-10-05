// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { createFakeDocumentStore, type FakeDocumentStore } from "@/test/fake-document-store";
import { __setDocumentStoreForTests } from "@/lib/documents/store";
import { CareerApplication } from "@/models/career-application";
import { Throttle } from "@/models/throttle";
import { maybeSweepCareers, retentionCutoff, sweepCareerApplications } from "./retention";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const NOW = new Date("2026-10-05T10:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;
let counter = 0;

async function seed(
  store: FakeDocumentStore,
  options: { createdAt: Date; stored?: boolean; deletedAt?: Date | null; removed?: boolean; withFile?: boolean },
) {
  counter += 1;
  const key = `cv/${String(counter).padStart(43, "a")}.pdf`;
  if (options.withFile !== false) await store.put(key, new Uint8Array([1]), "application/pdf");
  await CareerApplication.collection.insertOne({
    name: "A",
    email: `a${counter}@example.com`,
    phone: `+92300000${String(counter).padStart(4, "0")}`,
    qualification: "M.Ed",
    consentAt: options.createdAt,
    cv: {
      key,
      size: 1,
      storedAt: options.stored === false ? null : options.createdAt,
      removedAt: options.removed ? options.createdAt : null,
    },
    deletedAt: options.deletedAt ?? null,
    createdAt: options.createdAt,
    updatedAt: options.createdAt,
  });
  return key;
}

const count = () => CareerApplication.collection.countDocuments({});

describeWithDb("retention sweep", ["careerApplications", "throttles"], () => {
  let store: FakeDocumentStore;

  beforeEach(async () => {
    store = createFakeDocumentStore();
    __setDocumentStoreForTests(store);
    await CareerApplication.collection.deleteMany({});
    await Throttle.deleteMany({});
  });

  it("computes the cutoff in calendar months", () => {
    expect(retentionCutoff(NOW, 12).toISOString()).toBe("2025-10-05T10:00:00.000Z");
  });

  it("removes an application a day past retention with its file, and keeps one a day inside", async () => {
    const old = await seed(store, { createdAt: new Date("2025-10-04T09:00:00Z") });
    const recent = await seed(store, { createdAt: new Date("2025-10-06T10:00:00Z") });

    const counts = await sweepCareerApplications(NOW, store, 12);

    expect(counts.expired).toBe(1);
    expect(store.keys()).toEqual([recent]);
    expect(store.keys()).not.toContain(old);
    expect(await count()).toBe(1);
  });

  it("removes a soft-deleted application past retention", async () => {
    await seed(store, {
      createdAt: new Date("2025-09-01T00:00:00Z"),
      deletedAt: new Date("2026-01-01T00:00:00Z"),
      removed: true,
      withFile: false,
    });
    expect((await sweepCareerApplications(NOW, store, 12)).expired).toBe(1);
    expect(await count()).toBe(0);
  });

  it("keeps the record when the file cannot be removed, and removes both on the next run", async () => {
    await seed(store, { createdAt: new Date("2025-01-01T00:00:00Z") });
    store.failNext("delete");
    expect((await sweepCareerApplications(NOW, store, 12)).expired).toBe(0);
    expect(await count()).toBe(1);
    expect(store.keys()).toHaveLength(1);

    expect((await sweepCareerApplications(NOW, store, 12)).expired).toBe(1);
    expect(await count()).toBe(0);
    expect(store.keys()).toEqual([]);
  });

  it("retries a soft-deleted application whose file removal failed", async () => {
    const key = await seed(store, {
      createdAt: new Date("2026-09-01T00:00:00Z"),
      deletedAt: new Date("2026-09-02T00:00:00Z"),
    });
    const counts = await sweepCareerApplications(NOW, store, 12);
    expect(counts.retriedRemovals).toBe(1);
    expect(store.keys()).not.toContain(key);
    const doc = await CareerApplication.collection.findOne({ "cv.key": key });
    expect(doc?.cv.removedAt).toBeInstanceOf(Date);
  });

  it("removes a pending application after 61 minutes and keeps one at 59", async () => {
    const stale = await seed(store, { createdAt: new Date(NOW.getTime() - 61 * MIN), stored: false });
    const fresh = await seed(store, { createdAt: new Date(NOW.getTime() - 59 * MIN), stored: false });
    const counts = await sweepCareerApplications(NOW, store, 12);
    expect(counts.abandoned).toBe(1);
    expect(store.keys()).toEqual([fresh]);
    expect(store.keys()).not.toContain(stale);
    expect(await count()).toBe(1);
  });

  it("removes a pending application that never got a file", async () => {
    await seed(store, { createdAt: new Date(NOW.getTime() - 2 * DAY), stored: false, withFile: false });
    expect((await sweepCareerApplications(NOW, store, 12)).abandoned).toBe(1);
  });

  it("runs the opportunistic sweep once per hour window, and never throws", async () => {
    await seed(store, { createdAt: new Date("2020-01-01T00:00:00Z") });
    expect(await maybeSweepCareers()).toMatchObject({ expired: 1 });
    expect(await maybeSweepCareers()).toBeNull();

    await Throttle.deleteMany({});
    await seed(store, { createdAt: new Date("2020-01-01T00:00:00Z") });
    store.setAvailable(false);
    await expect(maybeSweepCareers()).resolves.toMatchObject({ expired: 0 });
  });
});

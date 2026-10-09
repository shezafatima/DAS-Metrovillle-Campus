// @vitest-environment node
import { it, expect } from "vitest";
import { describeWithDb } from "@/test/db";
import { AdminNotificationState } from "@/models/admin-notification-state";
import { getCareersLastOpenedAt, markCareersOpened } from "@/lib/notifications/state";

describeWithDb("notifications state", ["adminNotificationStates"], () => {
  it("creates a document defaulted to now for an unknown admin id", async () => {
    const before = Date.now();
    const moment = await getCareersLastOpenedAt("admin-1");
    const after = Date.now();
    expect(moment.getTime()).toBeGreaterThanOrEqual(before);
    expect(moment.getTime()).toBeLessThanOrEqual(after);
  });

  it("returns the same stored moment on a second read, without re-creating it", async () => {
    const first = await getCareersLastOpenedAt("admin-2");
    const second = await getCareersLastOpenedAt("admin-2");
    expect(second.getTime()).toBe(first.getTime());
  });

  it("fills the moment with now for an existing admin document that only has the old signups field", async () => {
    const legacy = new Date("2026-01-01T00:00:00.000Z");
    await AdminNotificationState.collection.insertOne({ _id: "legacy-admin" as never, signupsLastOpenedAt: legacy });

    const before = Date.now();
    const moment = await getCareersLastOpenedAt("legacy-admin");

    // Never the epoch and never the old signup moment, so existing applications do not flood in as new.
    expect(moment.getTime()).toBeGreaterThanOrEqual(before);
    const stored = await AdminNotificationState.collection.findOne({ _id: "legacy-admin" as never });
    expect(stored?.signupsLastOpenedAt).toEqual(legacy);
  });

  it("does not overwrite an existing moment", async () => {
    const earlier = new Date("2026-09-26T09:00:00.000Z");
    await markCareersOpened("admin-keep", earlier);
    expect(await getCareersLastOpenedAt("admin-keep")).toEqual(earlier);
  });

  it("two simultaneous first reads for the same admin agree and never conflict", async () => {
    const [a, b, c] = await Promise.all([
      getCareersLastOpenedAt("admin-race"),
      getCareersLastOpenedAt("admin-race"),
      getCareersLastOpenedAt("admin-race"),
    ]);
    expect(b.getTime()).toBe(a.getTime());
    expect(c.getTime()).toBe(a.getTime());
    expect(await AdminNotificationState.collection.countDocuments({ _id: "admin-race" as never })).toBe(1);
  });

  it("markCareersOpened advances the moment, reflected by a following read", async () => {
    await getCareersLastOpenedAt("admin-3");
    const now = new Date("2026-09-26T10:00:00.000Z");
    const returned = await markCareersOpened("admin-3", now);
    expect(returned).toEqual(now);

    expect(await getCareersLastOpenedAt("admin-3")).toEqual(now);
  });

  it("markCareersOpened works for an admin with no prior document (upsert)", async () => {
    const now = new Date("2026-09-26T11:00:00.000Z");
    await markCareersOpened("admin-4", now);
    expect(await getCareersLastOpenedAt("admin-4")).toEqual(now);
  });

  it("keeps independent documents per admin id", async () => {
    const a = await getCareersLastOpenedAt("admin-5");
    await markCareersOpened("admin-5", new Date("2026-01-01T00:00:00.000Z"));
    const b = await getCareersLastOpenedAt("admin-6");

    expect(b.getTime()).not.toBe(new Date("2026-01-01T00:00:00.000Z").getTime());
    expect(a).toBeInstanceOf(Date);
  });
});

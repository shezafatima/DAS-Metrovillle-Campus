// @vitest-environment node
import { it, expect } from "vitest";
import { describeWithDb } from "@/test/db";
import { getSignupsLastOpenedAt, markSignupsOpened } from "@/lib/notifications/state";

describeWithDb("notifications state", ["adminNotificationStates"], () => {
  it("creates a document defaulted to now for an unknown admin id", async () => {
    const before = Date.now();
    const moment = await getSignupsLastOpenedAt("admin-1");
    const after = Date.now();
    expect(moment.getTime()).toBeGreaterThanOrEqual(before);
    expect(moment.getTime()).toBeLessThanOrEqual(after);
  });

  it("returns the same stored moment on a second read, without re-creating it", async () => {
    const first = await getSignupsLastOpenedAt("admin-2");
    const second = await getSignupsLastOpenedAt("admin-2");
    expect(second.getTime()).toBe(first.getTime());
  });

  it("markSignupsOpened advances the moment, reflected by a following read", async () => {
    await getSignupsLastOpenedAt("admin-3");
    const now = new Date("2026-09-26T10:00:00.000Z");
    const returned = await markSignupsOpened("admin-3", now);
    expect(returned).toEqual(now);

    const after = await getSignupsLastOpenedAt("admin-3");
    expect(after).toEqual(now);
  });

  it("markSignupsOpened works for an admin with no prior document (upsert)", async () => {
    const now = new Date("2026-09-26T11:00:00.000Z");
    await markSignupsOpened("admin-4", now);
    const stored = await getSignupsLastOpenedAt("admin-4");
    expect(stored).toEqual(now);
  });

  it("keeps independent documents per admin id", async () => {
    const a = await getSignupsLastOpenedAt("admin-5");
    await markSignupsOpened("admin-5", new Date("2026-01-01T00:00:00.000Z"));
    const b = await getSignupsLastOpenedAt("admin-6");

    expect(b.getTime()).not.toBe(new Date("2026-01-01T00:00:00.000Z").getTime());
    expect(a).toBeInstanceOf(Date);
  });
});

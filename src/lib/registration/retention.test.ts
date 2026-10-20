// @vitest-environment node
import { Types } from "mongoose";
import { expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedRegistration } from "@/test/registration-seed";
import { RegistrationExport } from "@/models/registration-export";
import { StudentRegistration } from "@/models/student-registration";
import { maybeSweepRegistrations, sweepRegistrations } from "./retention";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const DAY = 86_400_000;
const NOW = new Date("2027-06-15T06:00:00Z");
const exists = async (id: string) => (await StudentRegistration.collection.countDocuments({ _id: new Types.ObjectId(id) } as never)) === 1;

describeWithDb("registration retention sweep", ["studentRegistrations", "registrationExports", "throttles"], () => {
  it("removes records older than retention, live or deleted, and keeps one a day inside", async () => {
    const live = await seedRegistration({ createdAt: new Date("2026-06-14T00:00:00Z") });
    const deleted = await seedRegistration({ createdAt: new Date("2026-06-14T00:00:00Z"), deletedAt: new Date(NOW.getTime() - DAY) });
    const keep = await seedRegistration({ createdAt: new Date("2026-06-16T00:00:00Z") });
    const counts = await sweepRegistrations(NOW, 12);
    expect(counts.expired).toBe(2);
    expect(await exists(live)).toBe(false);
    expect(await exists(deleted)).toBe(false);
    expect(await exists(keep)).toBe(true);
  });

  it("removes records deleted 30 days ago and keeps those deleted 29 days ago", async () => {
    const gone = await seedRegistration({ createdAt: new Date(NOW.getTime() - 60 * DAY), deletedAt: new Date(NOW.getTime() - 30 * DAY - 1000) });
    const kept = await seedRegistration({ createdAt: new Date(NOW.getTime() - 60 * DAY), deletedAt: new Date(NOW.getTime() - 29 * DAY) });
    await sweepRegistrations(NOW, 12);
    expect(await exists(gone)).toBe(false);
    expect(await exists(kept)).toBe(true);
  });

  it("removes export records older than retention", async () => {
    await RegistrationExport.collection.insertMany([
      { at: new Date("2026-01-01T00:00:00Z"), byUserId: "a", byEmail: "a@x.test", rows: 1, classFilter: null, searched: false },
      { at: new Date("2027-06-01T00:00:00Z"), byUserId: "a", byEmail: "a@x.test", rows: 1, classFilter: null, searched: false },
    ] as never);
    const counts = await sweepRegistrations(NOW, 12);
    expect(counts.exports).toBe(1);
    expect(await RegistrationExport.collection.countDocuments({})).toBe(1);
  });

  it("maybeSweepRegistrations runs at most once an hour", async () => {
    expect(await maybeSweepRegistrations()).not.toBeNull();
    expect(await maybeSweepRegistrations()).toBeNull();
  });

  it("never throws: a failure is logged with the event type only", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const spy = vi.spyOn(StudentRegistration.collection, "deleteMany").mockRejectedValueOnce(new Error("Zartasha leaked"));
    expect(await maybeSweepRegistrations()).toBeNull();
    spy.mockRestore();
    const output = info.mock.calls.map((call) => String(call[0])).join("\n");
    info.mockRestore();
    expect(output).toContain("registrations_sweep_failed");
    expect(output).not.toContain("Zartasha");
  });
});

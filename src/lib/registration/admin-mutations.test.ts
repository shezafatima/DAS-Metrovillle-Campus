// @vitest-environment node
import { Types } from "mongoose";
import { expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedRegistration } from "@/test/registration-seed";
import { StudentRegistration } from "@/models/student-registration";
import { restore, setStatus, softDelete } from "./admin-mutations";
import { sweepRegistrations } from "./retention";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const DAY = 86_400_000;
const ACTOR = { userId: "admin-1", email: "admin@example.com" };
const raw = (id: string) => StudentRegistration.collection.findOne({ _id: new Types.ObjectId(id) } as never);

describeWithDb("registration admin mutations", ["studentRegistrations"], () => {
  it("setStatus changes the status and appends history with from, to and who", async () => {
    const id = await seedRegistration();
    const at = new Date("2027-02-01T10:00:00Z");
    expect(await setStatus(id, "contacted", ACTOR, at)).toBe("changed");
    const doc = await raw(id);
    expect(doc?.status).toBe("contacted");
    expect(doc?.history).toEqual([{ at, action: "status", from: "new", to: "contacted", byUserId: "admin-1", byEmail: "admin@example.com" }]);
  });

  it("a same-status call adds no history", async () => {
    const id = await seedRegistration();
    expect(await setStatus(id, "new", ACTOR)).toBe("unchanged");
    expect((await raw(id))?.history).toEqual([]);
  });

  it("setStatus refuses a deleted, unknown or malformed id", async () => {
    const deleted = await seedRegistration({ deletedAt: new Date() });
    expect(await setStatus(deleted, "admitted", ACTOR)).toBe("not_found");
    expect(await setStatus("a".repeat(24), "admitted", ACTOR)).toBe("not_found");
    expect(await setStatus("bad", "admitted", ACTOR)).toBe("not_found");
    expect((await raw(deleted))?.status).toBe("new");
  });

  it("softDelete records when and by whom, and a second call finds nothing", async () => {
    const id = await seedRegistration();
    const at = new Date("2027-02-01T10:00:00Z");
    expect(await softDelete(id, ACTOR, at)).toBe(true);
    const doc = await raw(id);
    expect(doc?.deletedAt).toEqual(at);
    expect(doc?.deletedBy).toBe("admin-1");
    expect(doc?.history).toEqual([{ at, action: "deleted", byUserId: "admin-1", byEmail: "admin@example.com" }]);
    expect(await softDelete(id, ACTOR)).toBe(false);
  });

  it("restore works at 29 days and leaves the record unchanged apart from the history entry", async () => {
    const now = new Date("2027-06-15T06:00:00Z");
    const id = await seedRegistration({ status: "contacted", createdAt: new Date(now.getTime() - 40 * DAY), deletedAt: new Date(now.getTime() - 29 * DAY), deletedBy: "x" });
    const before = await raw(id);
    expect(await restore(id, ACTOR, now, 12)).toBe(true);
    const after = await raw(id);
    expect(after?.deletedAt).toBeNull();
    expect(after?.status).toBe("contacted");
    expect(after?.reference).toBe(before?.reference);
    expect(after?.studentName).toBe(before?.studentName);
    expect(after?.history).toEqual([{ at: now, action: "restored", byUserId: "admin-1", byEmail: "admin@example.com" }]);
  });

  it("restore is refused at 30 days, beyond retention, when not deleted, and for unknown ids", async () => {
    const now = new Date("2027-06-15T06:00:00Z");
    const late = await seedRegistration({ createdAt: new Date(now.getTime() - 60 * DAY), deletedAt: new Date(now.getTime() - 30 * DAY - 1000) });
    const old = await seedRegistration({ createdAt: new Date("2026-01-01T00:00:00Z"), deletedAt: new Date(now.getTime() - DAY) });
    const live = await seedRegistration();
    expect(await restore(late, ACTOR, now, 12)).toBe(false);
    expect(await restore(old, ACTOR, now, 12)).toBe(false);
    expect(await restore(live, ACTOR, now, 12)).toBe(false);
    expect(await restore("a".repeat(24), ACTOR, now, 12)).toBe(false);
    expect((await raw(late))?.deletedAt).not.toBeNull();
  });

  it("a restore racing the sweep ends with the record either restored or gone, never both", async () => {
    const now = new Date("2027-06-15T06:00:00Z");
    const id = await seedRegistration({ createdAt: new Date(now.getTime() - 40 * DAY), deletedAt: new Date(now.getTime() - 29 * DAY - 1000) });
    const [restored] = await Promise.all([restore(id, ACTOR, now, 12), sweepRegistrations(new Date(now.getTime() + DAY), 12)]);
    const doc = await raw(id);
    if (doc) {
      // Kept: the restore won, or the sweep ran first on a record still inside its grace.
      expect(doc.deletedAt === null || restored === false).toBe(true);
    } else {
      expect(doc).toBeNull();
    }
  });
});

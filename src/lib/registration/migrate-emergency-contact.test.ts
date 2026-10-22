// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { describeWithDb } from "@/test/db";
import { StudentRegistration } from "@/models/student-registration";
import { seedRegistration } from "@/test/registration-seed";
import { formatEmergencyMigrationReport, migrateEmergencyContacts } from "./migrate-emergency-contact";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

describe("formatEmergencyMigrationReport", () => {
  it("says a dry run wrote nothing and a confirmed run changed records", () => {
    expect(formatEmergencyMigrationReport({ toChange: 3, skipped: 0, applied: false })).toBe(
      "Dry run: 3 registration(s) would change. Nothing was written. Run again with --confirm to apply.",
    );
    const confirmed = formatEmergencyMigrationReport({ toChange: 3, skipped: 1, applied: true });
    expect(confirmed).toContain("Migrated 3 registration(s)");
    expect(confirmed).toContain("1 old-shape record(s) have no phone");
  });
});

/** A record the way the form saved it before 022: `emergencyContact` and no `emergencyPhone`. */
const oldShape = (contact: { name?: string; phone?: string }, extra: Record<string, unknown> = {}) =>
  seedRegistration({ emergencyPhone: null, emergencyContact: contact, ...extra });

const raw = (id: string) => StudentRegistration.collection.findOne({ _id: new mongoose.Types.ObjectId(id) });

describeWithDb("migrate emergency contact against the database", ["studentRegistrations"], () => {
  beforeEach(() => vi.resetModules());

  it("a dry run reports the count and changes nothing", async () => {
    const id = await oldShape({ name: "Uncle Testuncle", phone: "+923011234567" });
    await seedRegistration();
    expect(await migrateEmergencyContacts({ confirm: false })).toEqual({ toChange: 1, skipped: 0, applied: false });
    const record = await raw(id);
    expect(record?.emergencyContact).toEqual({ name: "Uncle Testuncle", phone: "+923011234567" });
    expect(record?.emergencyPhone).toBeNull();
  });

  it("--confirm keeps the phone as the number and the old name in the record, covers soft-deleted records, and is idempotent", async () => {
    const live = await oldShape({ name: "Uncle Testuncle", phone: "+923011234567" });
    const deleted = await oldShape({ name: "Aunt", phone: "+923021234567" }, { deletedAt: new Date() });
    const before = await raw(live);

    expect(await migrateEmergencyContacts({ confirm: true })).toEqual({ toChange: 2, skipped: 0, applied: true });

    const after = await raw(live);
    expect(after?.emergencyPhone).toBe("+923011234567");
    expect(after?.legacyEmergencyName).toBe("Uncle Testuncle");
    expect(after?.emergencyContact).toBeUndefined();
    expect(after?.updatedAt).toEqual(before?.updatedAt);
    const deletedAfter = await raw(deleted);
    expect(deletedAfter?.emergencyPhone).toBe("+923021234567");
    expect(deletedAfter?.legacyEmergencyName).toBe("Aunt");

    expect(await migrateEmergencyContacts({ confirm: true })).toEqual({ toChange: 0, skipped: 0, applied: false });
  });

  it("reports an old-shape record with no phone as skipped and leaves it alone", async () => {
    const id = await oldShape({ name: "No Phone" });
    expect(await migrateEmergencyContacts({ confirm: true })).toEqual({ toChange: 0, skipped: 1, applied: false });
    expect((await raw(id))?.emergencyContact).toEqual({ name: "No Phone" });
  });
});

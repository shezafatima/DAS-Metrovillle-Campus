// @vitest-environment node
import { Types } from "mongoose";
import { expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedRegistration } from "@/test/registration-seed";
import { StudentRegistration } from "@/models/student-registration";
import { classOptions, countRegistrations, getRegistration, listDeleted, listRegistrations } from "./admin-queries";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const DAY = 86_400_000;

describeWithDb("registration admin queries", ["studentRegistrations"], () => {
  it("lists newest first, 20 per page, excluding deleted", async () => {
    for (let i = 0; i < 25; i += 1) await seedRegistration({ createdAt: new Date(Date.now() - i * 60_000) });
    await seedRegistration({ deletedAt: new Date(), studentName: "Gone Child" });
    const first = await listRegistrations({ page: 1 });
    expect(first.total).toBe(25);
    expect(first.items).toHaveLength(20);
    expect(first.totalPages).toBe(2);
    const times = first.items.map((row) => Date.parse(row.submittedAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(first.items.some((row) => row.studentName === "Gone Child")).toBe(false);
    expect((await listRegistrations({ page: 2 })).items).toHaveLength(5);
    expect(await countRegistrations()).toBe(25);
  });

  it("searches student, father and mother names (Urdu substring, Latin case-insensitive)", async () => {
    await seedRegistration({ studentName: "زرتاشہ احمد", fatherName: "Imran", motherName: "Sana" });
    await seedRegistration({ studentName: "Bilal", fatherName: "Kamran Shah", motherName: "Nadia" });
    await seedRegistration({ studentName: "Hira", fatherName: "Tariq", motherName: "Rukhsana Begum" });
    expect((await listRegistrations({ q: "احمد" })).total).toBe(1);
    expect((await listRegistrations({ q: "KAMRAN" })).items[0].studentName).toBe("Bilal");
    expect((await listRegistrations({ q: "rukhsana" })).items[0].studentName).toBe("Hira");
    expect((await listRegistrations({ q: "(.*)" })).total).toBe(0);
  });

  it("filters by class and combines with search", async () => {
    await seedRegistration({ studentName: "Aaa", className: "Nursery" });
    await seedRegistration({ studentName: "Aab", className: "Class 1" });
    await seedRegistration({ studentName: "Bbb", className: "Class 1" });
    expect((await listRegistrations({ className: "Class 1" })).total).toBe(2);
    const both = await listRegistrations({ className: "Class 1", q: "aa" });
    expect(both.items.map((row) => row.studentName)).toEqual(["Aab"]);
  });

  it("classOptions is the distinct classes among live registrations", async () => {
    await seedRegistration({ className: "Nursery" });
    await seedRegistration({ className: "Class 1" });
    await seedRegistration({ className: "Class 1" });
    await seedRegistration({ className: "Removed Class", deletedAt: new Date() });
    expect(await classOptions()).toEqual(["Class 1", "Nursery"]);
  });

  it("flags the same child twice, not a sibling, and clears the flag when one is deleted", async () => {
    const a = await seedRegistration({ studentName: "Same Child", dateOfBirth: "2020-01-01", fatherMobile: "+923001111111" });
    await seedRegistration({ studentName: " same  CHILD ", dateOfBirth: "2020-01-01", fatherMobile: "+923001111111" });
    await seedRegistration({ studentName: "Sibling", dateOfBirth: "2021-01-01", fatherMobile: "+923001111111" });
    const rows = (await listRegistrations()).items;
    const flagged = rows.filter((row) => row.likelyDuplicate).map((row) => row.studentName.toLowerCase().replace(/\s+/g, " ").trim());
    expect(flagged).toEqual(["same child", "same child"]);
    expect((await getRegistration(a))?.likelyDuplicate).toBe(true);

    await StudentRegistration.collection.updateOne({ _id: new Types.ObjectId(a) } as never, { $set: { deletedAt: new Date() } });
    expect((await listRegistrations()).items.some((row) => row.likelyDuplicate)).toBe(false);
  });

  it("never flags a registration without a father's mobile", async () => {
    await seedRegistration({ studentName: "No Mobile", fatherMobile: null, motherMobile: "+923211111111" });
    await seedRegistration({ studentName: "No Mobile", fatherMobile: null, motherMobile: "+923211111111" });
    const rows = (await listRegistrations()).items;
    expect(rows.some((row) => row.likelyDuplicate)).toBe(false);
    expect(rows[0].mobile).toBe("+923211111111");
  });

  it("getRegistration returns null for malformed, unknown and deleted ids, and the full detail otherwise", async () => {
    const id = await seedRegistration({ medicalHistory: "PeanutAllergyMarker" });
    const deleted = await seedRegistration({ deletedAt: new Date() });
    expect(await getRegistration("nope")).toBeNull();
    expect(await getRegistration("a".repeat(24))).toBeNull();
    expect(await getRegistration(deleted)).toBeNull();
    const detail = await getRegistration(id);
    expect(detail?.medicalHistory).toBe("PeanutAllergyMarker");
    expect(detail?.emergencyPhone).toBe("+923011234567");
  });

  it("listDeleted shows only records deleted under 30 days ago and within retention, with days left", async () => {
    const now = new Date("2027-06-15T06:00:00Z");
    await seedRegistration({ studentName: "A29", deletedAt: new Date(now.getTime() - 29 * DAY), createdAt: new Date(now.getTime() - 40 * DAY) });
    await seedRegistration({ studentName: "A31", deletedAt: new Date(now.getTime() - 31 * DAY), createdAt: new Date(now.getTime() - 40 * DAY) });
    await seedRegistration({ studentName: "Old", deletedAt: new Date(now.getTime() - 2 * DAY), createdAt: new Date("2026-01-01T00:00:00Z") });
    await seedRegistration({ studentName: "Live" });
    const rows = await listDeleted(now, 12);
    expect(rows.map((row) => row.studentName)).toEqual(["A29"]);
    expect(rows[0].daysLeft).toBe(1);
  });

  it("days left is capped by the retention end when that comes first", async () => {
    const now = new Date("2027-06-15T06:00:00Z");
    await seedRegistration({ studentName: "Soon", deletedAt: new Date(now.getTime() - 1 * DAY), createdAt: new Date("2026-06-20T00:00:00Z") });
    const rows = await listDeleted(now, 12);
    expect(rows[0].daysLeft).toBeLessThanOrEqual(5);
    expect(rows[0].daysLeft).toBeGreaterThanOrEqual(1);
  });
});

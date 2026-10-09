// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedApplication } from "@/test/career-applications";
import { ADMIN_PAGE_SIZE } from "@/lib/admin-list";
import {
  countApplications,
  findApplicationsForExport,
  getApplication,
  listApplications,
} from "./admin-queries";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

describeWithDb("careers admin queries", ["careerApplications"], () => {
  it("lists newest first", async () => {
    await seedApplication({ name: "Oldest", createdAt: minutesAgo(30) });
    await seedApplication({ name: "Newest", createdAt: minutesAgo(1) });
    await seedApplication({ name: "Middle", createdAt: minutesAgo(10) });

    const { items } = await listApplications();
    expect(items.map((row) => row.name)).toEqual(["Newest", "Middle", "Oldest"]);
  });

  it("hides pending and deleted applications everywhere", async () => {
    const visible = await seedApplication({ name: "Visible" });
    await seedApplication({ name: "Pending", storedAt: null });
    await seedApplication({ name: "Deleted", deletedAt: new Date() });

    expect((await listApplications()).items.map((row) => row.name)).toEqual(["Visible"]);
    expect(await countApplications()).toBe(1);
    expect((await findApplicationsForExport()).map((row) => row.name)).toEqual(["Visible"]);
    expect(await getApplication(visible.id)).not.toBeNull();
  });

  describe("search", () => {
    async function seedSearchable() {
      await seedApplication({ name: "Ayesha Khan", email: "ayesha.khan@example.com", phone: "+923001234567", createdAt: minutesAgo(5) });
      await seedApplication({ name: "Bilal Ahmed", email: "bilal@school.test", phone: "+923457654321", createdAt: minutesAgo(4) });
      await seedApplication({ name: "عائشہ خان", email: "urdu@example.com", phone: "+923331112223", qualification: "ایم اے اردو", createdAt: minutesAgo(3) });
    }
    const names = async (q: string) => (await listApplications({ q })).items.map((row) => row.name).sort();

    it("finds by name, whatever the case", async () => {
      await seedSearchable();
      expect(await names("ayesha")).toEqual(["Ayesha Khan"]);
      expect(await names("BILAL")).toEqual(["Bilal Ahmed"]);
    });

    it("finds an Urdu name", async () => {
      await seedSearchable();
      expect(await names("عائشہ")).toEqual(["عائشہ خان"]);
    });

    it("finds by an email fragment", async () => {
      await seedSearchable();
      expect(await names("school.test")).toEqual(["Bilal Ahmed"]);
    });

    it.each(["0300 123", "+92 300 123", "300123", "0300-1234567"])("finds by the phone typed as %s", async (typed) => {
      await seedSearchable();
      expect(await names(typed)).toEqual(["Ayesha Khan"]);
    });

    it("treats regular-expression characters as plain text", async () => {
      await seedSearchable();
      expect(await names(".*")).toEqual([]);
      expect(await names("(")).toEqual([]);
    });

    it("returns everything for a blank search", async () => {
      await seedSearchable();
      expect(await names("   ")).toHaveLength(3);
    });
  });

  describe("pagination", () => {
    it("pages 45 applications as 20, 20 and 5, with totals", async () => {
      for (let i = 0; i < 45; i++) await seedApplication({ name: `Applicant ${i}`, createdAt: minutesAgo(100 - i) });

      const first = await listApplications({ page: 1 });
      const second = await listApplications({ page: 2 });
      const third = await listApplications({ page: 3 });

      expect([first.items.length, second.items.length, third.items.length]).toEqual([ADMIN_PAGE_SIZE, ADMIN_PAGE_SIZE, 5]);
      expect(first.total).toBe(45);
      expect(first.totalPages).toBe(3);
      // No application appears on two pages.
      const ids = [...first.items, ...second.items, ...third.items].map((row) => row.id);
      expect(new Set(ids).size).toBe(45);
    });

    it("reports the filtered totals, not the overall ones", async () => {
      for (let i = 0; i < 25; i++) await seedApplication({ name: `Match ${i}`, createdAt: minutesAgo(100 - i) });
      for (let i = 0; i < 10; i++) await seedApplication({ name: `Other ${i}`, createdAt: minutesAgo(50 - i) });

      const result = await listApplications({ q: "Match", page: 2 });
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(2);
      expect(result.items).toHaveLength(5);
    });

    it("treats a page below 1 as page 1", async () => {
      await seedApplication();
      expect((await listApplications({ page: 0 })).page).toBe(1);
      expect((await listApplications({ page: -3 })).page).toBe(1);
    });
  });

  it("export returns every filtered row, unpaginated", async () => {
    for (let i = 0; i < 45; i++) await seedApplication({ name: `Match ${i}`, createdAt: minutesAgo(100 - i) });
    await seedApplication({ name: "Other" });

    expect(await findApplicationsForExport({ q: "Match" })).toHaveLength(45);
    expect(await findApplicationsForExport()).toHaveLength(46);
  });

  it("rows carry no file information: no key, size, URL or timestamps beyond the applied date", async () => {
    const { id, key } = await seedApplication({ name: "Ayesha Khan" });

    const [row] = (await listApplications()).items;
    const detail = await getApplication(id);

    for (const value of [row, detail]) {
      expect(Object.keys(value!).sort()).toEqual(
        ["appliedAt", "email", "id", "name", "phone", "phoneDisplay", "qualification"].sort(),
      );
      expect(JSON.stringify(value)).not.toContain(key);
    }
  });

  describe("getApplication", () => {
    it("returns the application with its phone in local form", async () => {
      const { id } = await seedApplication({ phone: "+923001234567" });
      expect((await getApplication(id))?.phoneDisplay).toBe("03001234567");
    });

    it("returns null for a malformed, unknown, pending or deleted id", async () => {
      const pending = await seedApplication({ storedAt: null });
      const deleted = await seedApplication({ deletedAt: new Date() });
      for (const id of ["nope", "507f1f77bcf86cd799439011", pending.id, deleted.id, "../x"]) {
        expect(await getApplication(id), id).toBeNull();
      }
    });
  });
});

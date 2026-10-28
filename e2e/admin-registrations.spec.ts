import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  clearNotificationState,
  clearRegistrations,
  findExports,
  findRegistrations,
  loginAsAdmin,
  seedRegistrations,
  setRegistrationDates,
} from "./helpers/registrations";

// 013 US3 and US8 (admin): the main admin's Registrations section. Runs in the
// serial `admin` project against the shared E2E main admin.

const DAY = 86_400_000;
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);
const SEARCH = "Search by student, father or mother name…";

test.describe("admin registrations (013)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(240_000);
    await clearRegistrations();
    await clearNotificationState();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await clearRegistrations();
  });

  test("lists newest first with reference, student, class, father, mobile and submitted date", async ({ page }) => {
    await seedRegistrations([
      { studentName: "Oldest Child", fatherName: "Old Father", className: "Nursery", fatherMobile: "+923001110001", createdAt: minutesAgo(30) },
      { studentName: "Newest Child", fatherName: "New Father", className: "Class 1", fatherMobile: "+923001110002", createdAt: minutesAgo(1) },
      { studentName: "Mother Only", fatherName: "Third Father", fatherMobile: null, motherMobile: "+923211110003", createdAt: minutesAgo(10) },
    ]);
    await page.goto("/admin/registrations");
    const rows = page.getByTestId("registration-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Newest Child");
    await expect(rows.nth(1)).toContainText("Mother Only");
    await expect(rows.nth(2)).toContainText("Oldest Child");
    await expect(rows.nth(0)).toContainText("03001110002");
    await expect(rows.nth(0)).toContainText("Class 1");
    await expect(rows.nth(0)).toContainText("New Father");
    await expect(rows.nth(0)).toContainText(/[2-9A-HJKMNP-Z]{8}/);
    await expect(rows.nth(0)).toContainText(/\d{2} \w{3} \d{4}, \d{2}:\d{2}/);
    await expect(rows.nth(1)).toContainText("03211110003");
  });

  test("searches by student, father or mother name (Urdu included) and filters by class, combined", async ({ page }) => {
    await seedRegistrations([
      { studentName: "زرتاشہ احمد", fatherName: "Imran", motherName: "Sana", className: "Class 1" },
      { studentName: "Bilal", fatherName: "Kamran Shah", motherName: "Nadia", className: "Nursery" },
      { studentName: "Hira", fatherName: "Tariq", motherName: "Rukhsana Begum", className: "Class 1" },
      { studentName: "Hina", fatherName: "Tariq", motherName: "Rukhsana Begum", className: "Class 9 (no longer offered)" },
    ]);
    await page.goto("/admin/registrations");
    const rows = page.getByTestId("registration-row");
    const search = page.getByPlaceholder(SEARCH);

    await search.fill("احمد");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("زرتاشہ احمد");
    await search.fill("KAMRAN");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Bilal");
    await search.fill("rukhsana");
    await expect(rows).toHaveCount(2);

    // Class filter, including a class that is no longer in Settings, combined with the search.
    await page.getByLabel("Class", { exact: true }).selectOption("Class 9 (no longer offered)");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Hina");
    await search.fill("");
    await expect(rows).toHaveCount(1);
    await page.goto("/admin/registrations");
    await expect(rows).toHaveCount(4);
  });

  test("the same child twice is flagged Likely duplicate, a sibling is not, and deleting one clears the flag", async ({ page }) => {
    const seeded = await seedRegistrations([
      { studentName: "Same Child", dateOfBirth: "2020-01-01", fatherMobile: "+923001111111" },
      { studentName: "same  child", dateOfBirth: "2020-01-01", fatherMobile: "+923001111111" },
      { studentName: "Sibling", dateOfBirth: "2021-01-01", fatherMobile: "+923001111111" },
    ]);
    await page.goto("/admin/registrations");
    const rows = page.getByTestId("registration-row");
    await expect(rows.filter({ hasText: "Likely duplicate" })).toHaveCount(2);
    await expect(rows.filter({ hasText: "Sibling" })).not.toContainText("Likely duplicate");

    await page.goto(`/admin/registrations/${seeded[0].id}`);
    await page.getByRole("button", { name: "Delete registration" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/registrations$/, { timeout: 30_000 });
    await expect(page.getByTestId("registration-row").filter({ hasText: "Likely duplicate" })).toHaveCount(0);
  });

  test("the detail page shows every field, with Health information in its own headed block", async ({ page }) => {
    const [{ id }] = await seedRegistrations([{ studentName: "Zartasha Testchild", medicalHistory: "PeanutAllergyMarker\nsecond line", className: "Class 1" }]);
    await page.goto(`/admin/registrations/${id}`);
    await expect(page.getByRole("heading", { name: "Zartasha Testchild", level: 1 })).toBeVisible();
    for (const text of ["2020-05-01", "Class 1", "Metroville", "03011234567", "Urdu"]) {
      await expect(page.locator("main")).toContainText(text);
    }
    const health = page.getByRole("region", { name: "Health information" });
    await expect(health).toBeVisible();
    await expect(health).toContainText("PeanutAllergyMarker");
    await expect(health).toContainText("Vaccinated");
    // The Health block is separate from the other sections, and the list never shows health data.
    await expect(page.getByRole("region", { name: "Student" })).not.toContainText("PeanutAllergyMarker");
    await page.goto("/admin/registrations");
    await expect(page.locator("main")).not.toContainText("PeanutAllergyMarker");
  });

  test("a status change is saved and shown in the history with who and when", async ({ page }) => {
    const [{ id }] = await seedRegistrations([{ studentName: "Status Child" }]);
    await page.goto(`/admin/registrations/${id}`);
    await page.getByLabel("Status", { exact: true }).selectOption("contacted");
    await page.getByRole("button", { name: "Save status" }).click();
    await expect(page.getByTestId("registration-history")).toContainText("Status changed from New to Contacted", { timeout: 30_000 });
    await expect(page.getByTestId("registration-history")).toContainText("@");
    expect((await findRegistrations())[0].status).toBe("contacted");
  });

  test("delete hides it everywhere, the Deleted view lists it with days left, and restore brings it back unchanged", async ({ page }) => {
    const [{ id, reference }] = await seedRegistrations([{ studentName: "Delete Me", status: "admitted" }]);
    await page.goto(`/admin/registrations/${id}`);
    await page.getByRole("button", { name: "Delete registration" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/registrations$/, { timeout: 30_000 });
    await expect(page.getByText("No registrations yet.")).toBeVisible();
    expect((await page.request.get(`/api/admin/registrations/export`)).status()).toBe(200);
    expect((await (await page.request.get(`/api/admin/registrations/export`)).text()).split("\r\n").filter(Boolean)).toHaveLength(1);

    await page.getByRole("link", { name: "Deleted registrations" }).click();
    const deleted = page.getByTestId("deleted-registration-row");
    await expect(deleted).toHaveCount(1);
    await expect(deleted).toContainText("Delete Me");
    await expect(deleted).toContainText(reference);
    await expect(page.getByTestId("days-left")).toHaveText("30 days");

    await deleted.getByRole("button", { name: "Restore" }).click();
    await page.getByRole("button", { name: "Restore", exact: true }).last().click();
    await expect(page.getByText("No deleted registrations.")).toBeVisible({ timeout: 30_000 });
    await page.goto("/admin/registrations");
    const row = page.getByTestId("registration-row");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(reference);
    const [stored] = await findRegistrations();
    expect(stored.status).toBe("admitted");
    expect(stored.history.map((entry: { action: string }) => entry.action)).toEqual(["deleted", "restored"]);
  });

  test("a registration deleted 31 days ago is not in the Deleted view and cannot be restored", async ({ page }) => {
    const [{ id }] = await seedRegistrations([{ studentName: "Too Late Child" }]);
    await setRegistrationDates(id, { deletedAt: new Date(Date.now() - 31 * DAY) });
    await page.goto("/admin/registrations/deleted");
    await expect(page.getByText("No deleted registrations.")).toBeVisible();
    const response = await page.request.post(`/api/admin/registrations/${id}/restore`);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: "not_restorable" });
  });

  test("CSV download: headers, filtered rows, Urdu intact, and one export record without registration content", async ({ page }) => {
    await seedRegistrations([
      { studentName: "زرتاشہ احمد", className: "Class 1", fatherMobile: "+923001110001" },
      { studentName: "Other Class Child", className: "Nursery" },
    ]);
    const response = await page.request.get("/api/admin/registrations/export?class=Class%201");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("text/csv; charset=utf-8");
    expect(response.headers()["content-disposition"]).toMatch(/^attachment; filename="registrations-\d{4}-\d{2}-\d{2}\.csv"$/);
    const bytes = await response.body();
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = bytes.toString("utf8").replace(/^﻿/, "").split("\r\n").filter(Boolean);
    expect(lines[0]).toContain('"Reference","Submitted","Status","Likely duplicate","Student name"');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("زرتاشہ احمد");
    expect(lines[1]).toContain("03001110001");

    const exports = await findExports();
    expect(exports).toHaveLength(1);
    expect(exports[0]).toMatchObject({ rows: 1, classFilter: "Class 1", searched: false });
    expect(JSON.stringify(exports[0])).not.toContain("زرتاشہ");
  });

  test("the Export CSV link carries the current search and class", async ({ page }) => {
    await seedRegistrations([{ studentName: "Linked Child", className: "Class 1" }]);
    await page.goto("/admin/registrations?q=Linked&class=Class%201");
    const href = await page.getByRole("link", { name: "Export CSV" }).getAttribute("href");
    expect(href).toBe("/api/admin/registrations/export?q=Linked&class=Class+1");
  });

  test("a new registration raises the sidebar badge, the bell item (reference and class only) and the Overview count; visiting the list clears them", async ({ page }) => {
    await page.goto("/admin");
    // The first read fixes "now" as the baseline, so only later registrations count as new.
    await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
    await seedRegistrations([{ studentName: "Zartasha Testchild", className: "Class 1", medicalHistory: "PeanutAllergyMarker", createdAt: new Date() }]);

    const sidebarItem = page.getByRole("link", { name: "Registrations" }).locator("..");
    await expect(sidebarItem.getByText("1", { exact: true })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Notifications" }).click();
    const panel = page.getByRole("dialog");
    await expect(panel).toContainText(/Registration [2-9A-HJKMNP-Z]{8}/);
    await expect(panel).toContainText("Class 1");
    await expect(panel).not.toContainText("Zartasha");
    await expect(panel).not.toContainText("PeanutAllergyMarker");
    await page.keyboard.press("Escape");

    await page.goto("/admin");
    await expect(page.getByText("Registrations", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("1 new")).toBeVisible();

    await page.getByRole("link", { name: "Registrations" }).click();
    await expect(page.getByTestId("registration-row")).toHaveCount(1);
    await expect(sidebarItem.getByText("1", { exact: true })).not.toBeVisible({ timeout: 30_000 });
  });
});

test.describe("admin registrations layout and accessibility (013 US8)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(240_000);
    await clearRegistrations();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await clearRegistrations();
  });

  test("list, detail and Deleted view have no horizontal scroll at four widths and no axe violations", async ({ page }) => {
    const seeded = await seedRegistrations([
      { studentName: "Layout Child", medicalHistory: "Some note" },
      { studentName: "Deleted Layout Child", deletedAt: new Date(Date.now() - DAY) },
    ]);
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/admin/registrations", `/admin/registrations/${seeded[0].id}`, "/admin/registrations/deleted"]) {
        await page.goto(path);
        await expect(page.locator("main h1")).toBeVisible({ timeout: 60_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} at ${width}`).toBeLessThanOrEqual(0);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const path of ["/admin/registrations", `/admin/registrations/${seeded[0].id}`, "/admin/registrations/deleted"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible({ timeout: 60_000 });
      const result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => [n.target, n.any[0]?.message]))}`), path).toEqual([]);
    }
  });
});

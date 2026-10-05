import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import {
  FIXTURE_PDF,
  clearCareerApplications,
  findCareerApplications,
  forwardedFor,
  loginAsAdmin,
  seedCareerApplications,
  storeFileExists,
} from "./helpers/careers";
import { loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";

// Runs in the "admin" Playwright project (serial): the Applications list,
// detail, CV download, CSV export and the main-admin-only delete.

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);
const SEARCH = "Search by name, email or phone…";

test.describe("admin careers — list, search, detail, download, export", () => {
  test.use({ extraHTTPHeaders: forwardedFor(40) });

  test.beforeEach(async ({ page }) => {
    await clearCareerApplications();
    await loginAsAdmin(page);
  });

  test("lists applications newest first, with name, email, phone, qualification and applied date", async ({ page }) => {
    await seedCareerApplications([
      { name: "Oldest Applicant", email: "oldest@example.com", phone: "+923001110001", qualification: "BA", createdAt: minutesAgo(30) },
      { name: "Newest Applicant", email: "newest@example.com", phone: "+923001110002", qualification: "M.Ed", createdAt: minutesAgo(1) },
      { name: "Middle Applicant", email: "middle@example.com", phone: "+923001110003", qualification: "MSc", createdAt: minutesAgo(10) },
    ]);

    await page.goto("/admin/careers");
    const rows = page.getByTestId("application-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Newest Applicant");
    await expect(rows.nth(1)).toContainText("Middle Applicant");
    await expect(rows.nth(2)).toContainText("Oldest Applicant");
    await expect(rows.nth(0)).toContainText("newest@example.com");
    await expect(rows.nth(0)).toContainText("03001110002");
    await expect(rows.nth(0)).toContainText("M.Ed");
    await expect(rows.nth(0)).toContainText(/\d{2} \w{3} \d{4}, \d{2}:\d{2}/);
  });

  test("shows an empty state, and a different one when a search matches nothing", async ({ page }) => {
    await page.goto("/admin/careers");
    await expect(page.getByText("No applications yet.")).toBeVisible();

    await seedCareerApplications([{ name: "Ayesha Khan" }]);
    await page.goto("/admin/careers");
    await page.getByPlaceholder(SEARCH).fill("zzz-nothing");
    await expect(page.getByText("No applications match your search.")).toBeVisible({ timeout: 15000 });
  });

  test("searches by name (including Urdu), email and phone", async ({ page }) => {
    await seedCareerApplications([
      { name: "Ayesha Khan", email: "ayesha@example.com", phone: "+923001234567" },
      { name: "Bilal Ahmed", email: "bilal@school.test", phone: "+923457654321" },
      { name: "عائشہ خان", email: "urdu@example.com", phone: "+923331112223" },
    ]);
    await page.goto("/admin/careers");
    const rows = page.getByTestId("application-row");
    const search = page.getByPlaceholder(SEARCH);

    await search.fill("ayesha");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Ayesha Khan");

    await search.fill("عائشہ");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("عائشہ خان");

    await search.fill("school.test");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Bilal Ahmed");

    await search.fill("0300 123");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Ayesha Khan");
  });

  test("paginates at 20 and keeps the search while paging", async ({ page }) => {
    const seeds = Array.from({ length: 25 }, (_, i) => ({ name: `Match ${String(i).padStart(2, "0")}`, createdAt: minutesAgo(100 - i) }));
    await seedCareerApplications([...seeds, { name: "Other Person", createdAt: minutesAgo(1) }]);

    await page.goto("/admin/careers");
    await page.getByPlaceholder(SEARCH).fill("Match");
    // Wait until the search has really been applied (the box is debounced): the URL carries it
    // and the one non-matching application is gone, so the Next link is the filtered one.
    await expect(page).toHaveURL(/q=Match/, { timeout: 30000 });
    await expect(page.getByText("Other Person")).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByTestId("application-row")).toHaveCount(20);

    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/q=Match/, { timeout: 60000 });
    await expect(page).toHaveURL(/page=2/, { timeout: 60000 });
    await expect(page.getByTestId("application-row")).toHaveCount(5);
    await expect(page.getByText("Other Person")).toHaveCount(0);
  });

  test("opens an application and downloads its CV as a PDF file", async ({ page }) => {
    const [{ id }] = await seedCareerApplications([
      { name: "Ayesha Khan", email: "ayesha@example.com", phone: "+923001234567", qualification: "M.Ed" },
    ]);

    await page.goto("/admin/careers");
    await page.getByRole("link", { name: "Ayesha Khan" }).click();
    // The first visit to the detail page compiles it, which can take a while in development.
    await expect(page).toHaveURL(new RegExp(`/admin/careers/${id}$`), { timeout: 120000 });
    await expect(page.getByRole("heading", { name: "Ayesha Khan", level: 1 })).toBeVisible();
    await expect(page.getByText("ayesha@example.com")).toBeVisible();
    await expect(page.getByText("03001234567")).toBeVisible();
    await expect(page.getByText("M.Ed")).toBeVisible();

    // No preview of any kind inside the panel.
    await expect(page.locator("main iframe, main embed, main object")).toHaveCount(0);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: /Download CV/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^cv-ayesha-khan-\d{4}-\d{2}-\d{2}\.pdf$/);
    const bytes = await readFile((await download.path())!);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("exports the current filtered list as a CSV with the byte-order mark and Urdu names intact", async ({ page }) => {
    await seedCareerApplications([
      { name: "عائشہ خان", email: "urdu@example.com", phone: "+923331112223", qualification: "ایم اے اردو" },
      { name: "Bilal Ahmed", email: "bilal@example.com", phone: "+923457654321" },
    ]);

    await page.goto("/admin/careers");
    await page.getByPlaceholder(SEARCH).fill("عائشہ");
    await expect(page.getByTestId("application-row")).toHaveCount(1);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Export CSV" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^applications-\d{4}-\d{2}-\d{2}\.csv$/);
    const bytes = await readFile((await download.path())!);
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = bytes.toString("utf8");
    expect(text).toContain('"Name","Email","Phone","Qualification","Applied"');
    expect(text).toContain("عائشہ خان");
    expect(text).toContain("ایم اے اردو");
    expect(text).not.toContain("Bilal Ahmed"); // only the filtered list
  });
});

test.describe("admin careers — delete (main admin only)", () => {
  test.use({ extraHTTPHeaders: forwardedFor(41) });

  test.beforeEach(async () => {
    await clearCareerApplications();
    await resetUsers();
  });

  test("the main admin confirms, the application and its file are gone, and the person can apply again at once", async ({ page }) => {
    const [{ id, key }] = await seedCareerApplications([
      { name: "Ayesha Khan", email: "ayesha@example.com", phone: "+923001234567" },
    ]);
    expect(await storeFileExists(key)).toBe(true);
    await loginAsAdmin(page);

    await page.goto(`/admin/careers/${id}`);
    // Cancelling changes nothing.
    await page.getByRole("button", { name: "Delete application" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Ayesha Khan", level: 1 })).toBeVisible();
    expect(await storeFileExists(key)).toBe(true);

    // Confirming removes it.
    await page.getByRole("button", { name: "Delete application" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/careers$/, { timeout: 15000 });
    await expect(page.getByText("Ayesha Khan")).toHaveCount(0);
    await expect(page.getByText("No applications yet.")).toBeVisible();
    expect(await storeFileExists(key)).toBe(false);

    // The same person applies again straight away, inside the 30-day window.
    await page.goto("/careers");
    await page.getByRole("textbox", { name: "Full name" }).fill("Ayesha Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ayesha@example.com");
    await page.getByRole("textbox", { name: "Mobile number" }).fill("03001234567");
    await page.getByRole("textbox", { name: "Highest qualification" }).fill("M.Ed");
    await page.locator("#careers-cv").setInputFiles(FIXTURE_PDF);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 15000 });
    expect(await findCareerApplications({ email: "ayesha@example.com" })).toHaveLength(1);
  });

  test("a content manager holding careers can view and download but is shown no delete control", async ({ browser }) => {
    const [{ id }] = await seedCareerApplications([{ name: "Ayesha Khan" }]);
    const manager = await seedActiveUser({ email: "cm-careers-view@example.test", permissions: ["careers"] });
    const { page } = await loginSeeded(browser, manager);

    await page.goto("/admin/careers");
    await expect(page.getByTestId("application-row")).toHaveCount(1);
    await page.goto(`/admin/careers/${id}`);
    await expect(page.getByRole("heading", { name: "Ayesha Khan", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Download CV/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);

    // And the server refuses a direct request, whatever the page shows.
    const response = await page.request.delete(`/api/admin/careers/${id}`);
    expect(response.status()).toBe(403);
    expect(await findCareerApplications({ email: undefined })).toHaveLength(1);
  });
});

const WIDTHS: Array<{ w: number; h: number }> = [
  { w: 375, h: 900 },
  { w: 768, h: 1024 },
  { w: 1024, h: 900 },
  { w: 1440, h: 900 },
];

test.describe("admin careers — layout", () => {
  test.use({ extraHTTPHeaders: forwardedFor(42) });

  test.beforeEach(async ({ page }) => {
    await clearCareerApplications();
    await loginAsAdmin(page);
  });

  for (const { w, h } of WIDTHS) {
    test(`the list and a detail page have no horizontal page scroll at ${w}px`, async ({ page }) => {
      const [{ id }] = await seedCareerApplications([
        { name: "Ayesha Khan with a rather long full name for layout", email: "a-very-long-email-address-for-layout@example.com" },
        { name: "عائشہ خان", qualification: "ایم اے اردو" },
      ]);
      await page.setViewportSize({ width: w, height: h });

      for (const path of ["/admin/careers", `/admin/careers/${id}`]) {
        await page.goto(path);
        await expect(page.locator("main h1").first()).toBeVisible();
        const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        expect(overflowing, `${path} at ${w}px`).toBe(false);
      }
    });
  }
});

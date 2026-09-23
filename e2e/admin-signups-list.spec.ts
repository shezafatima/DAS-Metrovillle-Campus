import { test, expect } from "@playwright/test";
import { clearSignups, loginAsAdmin, seedSignups } from "./helpers/signups";

test.describe("admin signups list (US3)", () => {
  test.beforeEach(async () => {
    await clearSignups();
  });

  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/admin/signups");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fsignups/);
  });

  test("lists newest first, paginates 25 into 20 + 5, and keeps search/filter across pages", async ({ page }) => {
    const seeds = Array.from({ length: 25 }, (_, i) => ({
      name: `Person ${i}`,
      email: `person-${i}@example.com`,
      phone: "+923001234567",
      sources: ["home" as const],
      lastSignupAt: new Date(Date.UTC(2026, 0, i + 1)),
    }));
    await seedSignups(seeds);

    await loginAsAdmin(page);
    await page.goto("/admin/signups");

    await expect(page.locator("table tbody tr")).toHaveCount(20);
    await expect(page.locator("table tbody tr").first()).toContainText("Person 24");

    await page.getByRole("link", { name: "Next" }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(5);
  });

  test("shows an Urdu name correctly", async ({ page }) => {
    await seedSignups([{ name: "علی خان", email: "urdu@example.com", phone: "+923001234567" }]);
    await loginAsAdmin(page);
    await page.goto("/admin/signups");

    const nameCell = page.locator("table tbody tr td span[dir='auto']");
    await expect(nameCell).toContainText("علی خان");
  });

  test("searches by name, and by phone regardless of how it is typed", async ({ page }) => {
    await seedSignups([
      { name: "Ali Khan", email: "ali@example.com", phone: "+923001234567" },
      { name: "Sara Ahmed", email: "sara@example.com", phone: "+923009999999" },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/signups");

    await page.getByLabel("Search by name, email or phone…").fill("khan");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("Ali Khan");

    await page.getByLabel("Search by name, email or phone…").fill("");
    await page.getByLabel("Search by name, email or phone…").fill("0300 123");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("03001234567");
  });

  test("filters by page (source)", async ({ page }) => {
    await seedSignups([
      { name: "Resources Person", email: "resources@example.com", phone: "+923001234567", sources: ["resources"] },
      { name: "Home Person", email: "home@example.com", phone: "+923009999999", sources: ["home"] },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/signups");

    await page.getByLabel("Page").selectOption("resources");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("Resources Person");
  });

  test("keeps search and source filter in the URL when moving to the next page", async ({ page }) => {
    const seeds = Array.from({ length: 25 }, (_, i) => ({
      name: `Ali Match ${i}`,
      email: `ali-${i}@example.com`,
      phone: "+923001234567",
      sources: ["home" as const],
      lastSignupAt: new Date(Date.UTC(2026, 0, i + 1)),
    }));
    await seedSignups(seeds);
    await loginAsAdmin(page);
    await page.goto("/admin/signups?q=ali&source=home");

    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/[?&]q=ali/);
    await expect(page).toHaveURL(/[?&]source=home/);
  });

  test("email and phone cells are clickable mailto:/tel: links", async ({ page }) => {
    await seedSignups([{ name: "Ali Khan", email: "ali@example.com", phone: "+923001234567" }]);
    await loginAsAdmin(page);
    await page.goto("/admin/signups");

    const emailLink = page.getByRole("link", { name: "ali@example.com" });
    await expect(emailLink).toHaveAttribute("href", "mailto:ali@example.com");

    const phoneLink = page.getByRole("link", { name: "03001234567" });
    await expect(phoneLink).toHaveAttribute("href", "tel:+923001234567");
  });

  test("shows the empty state when there are no signups", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/signups");
    await expect(page.getByText("No signups yet.")).toBeVisible();
  });

  test("the overview Signups card shows the live count", async ({ page }) => {
    await seedSignups([
      { name: "A", email: "a@example.com", phone: "+923001234567" },
      { name: "B", email: "b@example.com", phone: "+923009999999" },
      { name: "C", email: "c@example.com", phone: "+923008888888" },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin");
    const signupsCard = page.locator("[data-slot='card']").filter({ hasText: "Signups" });
    await expect(signupsCard).toContainText("3");
  });
});

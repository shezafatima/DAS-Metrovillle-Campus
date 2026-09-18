import { test, expect } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import { adminNavItems } from "../src/content/admin";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/admin");
}

test.describe("admin layout (US4)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const item of adminNavItems) {
    test(`${item.label} section: active sidebar item, top bar email, no public chrome`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(item.href);

      await expect(page.getByRole("link", { name: item.label, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByText(E2E_ADMIN.email)).toBeVisible();
      await expect(page.getByRole("banner")).toHaveCount(0);
      await expect(page.getByRole("contentinfo")).toHaveCount(0);
    });
  }

  test("has a noindex robots meta tag", async ({ page }) => {
    await page.goto("/admin");
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");
  });

  for (const width of [375, 768]) {
    test(`at ${width}px the sidebar is hidden behind a menu button`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/admin");

      await expect(page.getByRole("navigation", { name: "Admin" })).toBeHidden();
      const menuButton = page.getByRole("button", { name: "Open menu" });
      await expect(menuButton).toBeVisible();

      await menuButton.click();
      const drawerNav = page.getByRole("navigation", { name: "Admin" });
      await expect(drawerNav).toBeVisible();
      for (const item of adminNavItems) {
        await expect(drawerNav.getByRole("link", { name: item.label })).toBeVisible();
      }

      await page.keyboard.press("Escape");
      await expect(drawerNav).toBeHidden();

      const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(bodyWidth).toBeLessThanOrEqual(clientWidth);
    });
  }

  for (const width of [1024, 1440]) {
    test(`at ${width}px the sidebar is visible without a menu button`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin");

      await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();

      const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(bodyWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
});

test("no public page links to an admin page", async ({ page }) => {
  await page.goto("/");
  const adminLinks = await page.locator('a[href^="/admin"]').count();
  expect(adminLinks).toBe(0);
});

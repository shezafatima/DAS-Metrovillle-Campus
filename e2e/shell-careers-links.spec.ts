import { test, expect, type Page } from "@playwright/test";

// 012 US5: Careers is reachable from the About menu, the footer and the
// home page's Join Now button, at phone and desktop widths. The main menu
// stays at its eight top-level items. Named shell-* so it runs in the `chromium`
// project, not the serial `forms` one.

const WIDTHS = [375, 768, 1024, 1440];

async function expectCareersPage(page: Page) {
  // The first visit compiles the page in development, which can be slow.
  await expect(page).toHaveURL(/\/careers$/, { timeout: 120_000 });
  await expect(page.getByRole("heading", { name: "Careers", level: 1 })).toBeVisible();
}

for (const width of WIDTHS) {
  test.describe(`careers entry points at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { timeout: 120_000 });
    });

    test("Careers is in the About menu and goes to /careers", async ({ page }) => {
      if (width >= 1024) {
        const about = page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "About", exact: true });
        await about.hover();
        await expect(about).toHaveAttribute("aria-expanded", "true");
      } else {
        await page.getByRole("button", { name: "Open menu" }).click();
        await page.getByRole("navigation", { name: "Mobile menu" }).getByRole("button", { name: "About" }).click();
      }
      const menuName = width >= 1024 ? "Main menu" : "Mobile menu";
      const link = page.getByRole("navigation", { name: menuName }).getByRole("link", { name: "Careers", exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/careers");
      await link.click();
      await expectCareersPage(page);
    });

    test("the footer link goes to /careers", async ({ page }) => {
      const link = page.getByRole("contentinfo").getByRole("link", { name: "Careers", exact: true });
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/careers");
      await link.click();
      await expectCareersPage(page);
    });

    test("the home page's Join Now button goes to /careers", async ({ page }) => {
      const button = page.getByRole("link", { name: "Join Now" });
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute("href", "/careers");
      // The home page's carousels and images are still settling while it loads, which can move the
      // button just as it is clicked; retry the click until the navigation happens.
      await expect(async () => {
        await button.scrollIntoViewIfNeeded();
        await button.click({ timeout: 10_000 });
        await expect(page).toHaveURL(/\/careers$/, { timeout: 8_000 });
      }).toPass({ timeout: 120_000 });
      await expectCareersPage(page);
    });
  });
}

test("the main menu keeps eight top-level items; Careers is not one of them", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { timeout: 120_000 });
  const menu = page.getByRole("navigation", { name: "Main menu" });
  await expect(menu.locator(":scope > ul > li")).toHaveCount(8);
  await expect(menu.locator(":scope > ul > li > a", { hasText: /^Careers$/ })).toHaveCount(0);
});

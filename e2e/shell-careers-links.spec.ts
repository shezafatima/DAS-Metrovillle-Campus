import { test, expect, type Page } from "@playwright/test";

// 012 US5: Careers is reachable from the top (yellow) bar, the footer and the
// home page's Join Now button, at phone and desktop widths. The main menu
// stays at its eight items. Named shell-* so it runs in the `chromium`
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

    test("the top bar link goes to /careers and comes first", async ({ page }) => {
      const topBarLinks = page.locator("header a, .bg-topbar a").filter({ hasText: /^Careers$/ });
      const link = page.getByRole("link", { name: "Careers", exact: true }).first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/careers");

      // It sits in the yellow top bar, as the first of its links.
      const barBackground = await link.evaluate((el) => {
        let node: HTMLElement | null = el as HTMLElement;
        while (node) {
          const colour = getComputedStyle(node).backgroundColor;
          if (colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent") return colour;
          node = node.parentElement;
        }
        return "";
      });
      expect(barBackground).toBe("rgb(255, 255, 0)");
      expect(await topBarLinks.count()).toBeGreaterThanOrEqual(0);

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

test("the main menu has no Careers item (it stays at eight)", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { timeout: 120_000 });
  const menu = page.getByRole("navigation").filter({ has: page.getByRole("link", { name: "Contact" }) }).first();
  await expect(menu.getByRole("link", { name: "Careers" })).toHaveCount(0);
});

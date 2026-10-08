import { test, expect, type Page } from "@playwright/test";

// The header is sticky at every width and has one fixed height, so scrolling
// never changes the page height. On the home page it is transparent over the
// hero (white links on a dark scrim, the usual logo) until the visitor scrolls, then
// solid; on every other page it is solid from the top (FR-016, amended).

const WIDTHS = [375, 768, 1024, 1440];
const TRANSPARENT = "rgba(0, 0, 0, 0)";

const background = (page: Page) => page.getByRole("banner").evaluate((el) => getComputedStyle(el).backgroundColor);
const top = (page: Page) => page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().top);
const height = (page: Page) => page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().height);
const pageHeight = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight);

/** The colour of the visible mobile-menu icon or the first desktop nav label. */
const controlColour = (page: Page, width: number) =>
  (width >= 1024
    ? page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Home" }).locator("span").first()
    : page.getByRole("button", { name: "Open menu" })
  ).evaluate((el) => getComputedStyle(el).color);

for (const width of WIDTHS) {
  test.describe(`Header at ${width}px`, () => {
    test.use({ viewport: { width, height: 500 } });

    test("is sticky and keeps one height while scrolling a content page", async ({ page }) => {
      await page.goto("/campuses");
      // The placeholder page is shorter than the viewport; make it tall enough to scroll.
      await page.evaluate(() => { document.body.style.minHeight = "3000px"; });
      const heightBefore = await height(page);
      const pageBefore = await pageHeight(page);
      expect(await top(page)).toBeCloseTo(0, 0);
      expect(await background(page)).not.toBe(TRANSPARENT);

      await page.mouse.wheel(0, 600);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
      expect(await top(page)).toBeCloseTo(0, 0);
      expect(await height(page)).toBe(heightBefore);
      expect(await pageHeight(page)).toBe(pageBefore);
      await expect(page.getByRole("banner")).toBeInViewport();
    });

    test("is transparent over the home hero with white links, solid once scrolled", async ({ page }) => {
      test.setTimeout(300_000);
      await page.goto("/", { timeout: 120_000 });
      const header = page.getByRole("banner");
      await expect(header).toHaveAttribute("data-transparent", "true");
      await expect.poll(() => background(page)).toBe(TRANSPARENT);
      expect(await controlColour(page, width)).toBe("rgb(255, 255, 255)");
      expect(await top(page)).toBeCloseTo(0, 0);
      // The header overlays the hero rather than pushing it down.
      expect(await page.getByTestId("hero").evaluate((el) => el.getBoundingClientRect().top)).toBeCloseTo(0, 0);
      // The logo is the same artwork in both states.
      await expect(header.locator('img[src*="logo.svg"]')).toBeVisible();

      const heightBefore = await height(page);
      await page.mouse.wheel(0, 300);
      await expect(header).toHaveAttribute("data-transparent", "false");
      await expect.poll(() => background(page)).not.toBe(TRANSPARENT);
      expect(await top(page)).toBeCloseTo(0, 0);
      expect(await height(page)).toBe(heightBefore);
      expect(await controlColour(page, width)).not.toBe("rgb(255, 255, 255)");
      await expect(header.locator('img[src*="logo.svg"]')).toBeVisible();
    });

    test("is solid from the top on a page with a banner", async ({ page }) => {
      await page.goto("/contact");
      await expect(page.getByRole("banner")).toHaveAttribute("data-transparent", "false");
      expect(await background(page)).not.toBe(TRANSPARENT);
    });
  });
}

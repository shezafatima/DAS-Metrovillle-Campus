import { test, expect, type Page } from "@playwright/test";

// The header is sticky at every width and has one fixed height, so scrolling
// never changes the page height. It is white on every page, home included, and
// overlays the full-height home hero (FR-016, amended).

const WIDTHS = [375, 768, 1024, 1440];

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
      await page.goto("/contact");
      // Make sure the page is tall enough to scroll.
      await page.evaluate(() => { document.body.style.minHeight = "3000px"; });
      const heightBefore = await height(page);
      const pageBefore = await pageHeight(page);
      expect(await top(page)).toBeCloseTo(0, 0);
      expect(await background(page)).toBe("rgb(255, 255, 255)");

      await page.mouse.wheel(0, 600);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
      expect(await top(page)).toBeCloseTo(0, 0);
      expect(await height(page)).toBe(heightBefore);
      expect(await pageHeight(page)).toBe(pageBefore);
      await expect(page.getByRole("banner")).toBeInViewport();
    });

    test("is white over the home hero, as it is after scrolling", async ({ page }) => {
      test.setTimeout(300_000);
      await page.goto("/", { timeout: 120_000 });
      const header = page.getByRole("banner");
      await expect(header).not.toHaveAttribute("data-transparent", /.*/);
      expect(await background(page)).toBe("rgb(255, 255, 255)");
      expect(await controlColour(page, width)).not.toBe("rgb(255, 255, 255)");
      const heightBefore = await height(page);
      expect(await top(page)).toBeCloseTo(0, 0);
      // The white header overlays the full-height hero rather than pushing it down.
      expect(await page.getByTestId("hero").evaluate((el) => el.getBoundingClientRect().top)).toBeCloseTo(0, 0);
      expect(await page.getByTestId("hero").evaluate((el) => el.getBoundingClientRect().height)).toBeCloseTo(500, 0);
      await expect(header.locator('img[src*="logo.svg"]')).toBeVisible();

      await page.mouse.wheel(0, 300);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
      expect(await top(page)).toBeCloseTo(0, 0);
      expect(await height(page)).toBe(heightBefore);
      expect(await background(page)).toBe("rgb(255, 255, 255)");
    });

    test("is solid from the top on a page with a banner", async ({ page }) => {
      await page.goto("/contact");
      expect(await background(page)).toBe("rgb(255, 255, 255)");
    });
  });
}

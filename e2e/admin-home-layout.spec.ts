import { test, expect } from "@playwright/test";
import { seedPosts } from "./helpers/news";
import { bookFilesPresent, openHome, resetHome, seedHero, slide, stubImages } from "./helpers/home";
import { hasNoHorizontalScroll } from "./helpers/gallery";

/**
 * Home layout and motion (006 FR-031, FR-033, SC-007, SC-008): no sideways
 * scroll at the four standard widths and the reference's own breakpoints,
 * with a long hero heading and an Urdu post; with reduced motion nothing
 * moves by itself.
 */
const WIDTHS = [375, 480, 640, 768, 782, 1024, 1280, 1440];

test.describe("home — layout and motion (006)", () => {
  test.beforeAll(async () => {
    await resetHome();
    await seedHero([slide(1, { heading: "A very long hero heading that keeps going to test how the slide wraps on narrow screens" }), slide(2)], 3);
    const d = new Date();
    await seedPosts([{ title: "فکر اقبال اور تعلیمی نظام", slug: "urdu-layout", status: "published", language: "ur", publishDate: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) }]);
  });
  test.afterAll(async () => {
    await resetHome();
  });

  test("no sideways scroll at any width", async ({ browser }) => {
    test.setTimeout(900_000);
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await stubImages(page);
      await openHome(page);
      expect(await hasNoHorizontalScroll(page), `home at ${width}px`).toBe(true);
      await context.close();
    }
  });

  test("with reduced motion, the hero, books and partners do not move by themselves", async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await stubImages(page);
    await openHome(page);
    const active = () => page.locator('[data-testid="hero-slide"][data-active]').textContent();
    const withBooks = bookFilesPresent() > 0;
    const snapshot = async () => ({ hero: await active(), books: withBooks ? await scrollOf("books") : 0, partners: await scrollOf("partners") });
    const before = await snapshot();
    await page.waitForTimeout(7_000);
    expect(await snapshot()).toEqual(before);
    await context.close();
  });
});

import { test, expect } from "@playwright/test";

// Reference behavior (research/tokens/home-*.json <html> classes):
// "fusion-sticky-header no-tablet-sticky-header no-mobile-sticky-header
// avada-sticky-shrinkage" — sticky + shrink-on-scroll at desktop (>=1024px)
// only; the header scrolls away normally below that (FR-016).

test.describe("Header scroll behavior — desktop", () => {
  // A short viewport, combined with the header + placeholder + footer that
  // every route currently renders, guarantees the page is tall enough to
  // scroll even though real page content doesn't exist yet (spec.md
  // Out of Scope — placeholders only in this feature).
  test.use({ viewport: { width: 1440, height: 500 } });

  test("the header stays pinned (sticky) while scrolling", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    const topBefore = await header.evaluate(
      (el) => el.getBoundingClientRect().top
    );
    expect(topBefore).toBeCloseTo(0, 0);

    await page.mouse.wheel(0, 600);
    await expect(header).toBeInViewport();
    const topAfter = await header.evaluate(
      (el) => el.getBoundingClientRect().top
    );
    expect(topAfter).toBeCloseTo(0, 0);
  });

  test("the top bar shrinks away once scrolled past the threshold", async ({
    page,
  }) => {
    await page.goto("/");
    const collapseWrapper = page.locator("header > div").first();
    const heightBefore = await collapseWrapper.evaluate(
      (el) => el.getBoundingClientRect().height
    );
    expect(heightBefore).toBeGreaterThan(4);

    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400); // matches --motion-medium transition

    const heightAfter = await collapseWrapper.evaluate(
      (el) => el.getBoundingClientRect().height
    );
    expect(heightAfter).toBeLessThan(4);
  });
});

test.describe("Header scroll behavior — mobile", () => {
  test.use({ viewport: { width: 375, height: 500 } });

  test("the header scrolls away with the page (not sticky)", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    const topBefore = await header.evaluate(
      (el) => el.getBoundingClientRect().top
    );
    expect(topBefore).toBeCloseTo(0, 0);

    await page.mouse.wheel(0, 600);
    const topAfter = await header.evaluate(
      (el) => el.getBoundingClientRect().top
    );
    expect(topAfter).toBeLessThan(-50);
  });
});

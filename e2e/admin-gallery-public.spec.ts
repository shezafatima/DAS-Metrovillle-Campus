import { test, expect, type Page } from "@playwright/test";
import { albumId, clearGallery, hasNoHorizontalScroll, seedAlbums } from "./helpers/gallery";
import { PIXEL_PNG } from "./helpers/pixel";
import { galleryContent } from "../src/content/gallery";

/**
 * The public Photo Gallery (007 US4, US5). Named admin-gallery-* so it runs in
 * the serial admin project: it seeds the one shared gallery document. No
 * sign-in is needed; these are public pages.
 */

const MAIN = albumId("annualday");
const EMPTY = albumId("emptyalbum");
const LONG_TITLE = "A very long album title that keeps going to test wrapping across the whole card now";
const URDU = "سالانہ تقریب تقسیم انعامات";

async function stubImages(page: Page) {
  await page.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG }));
}

async function seedTwo() {
  await seedAlbums([
    {
      id: MAIN,
      title: "Annual Day",
      description: "Prize giving and speeches",
      date: "2026-03-12",
      photos: Array.from({ length: 8 }, (_, i) => ({ name: `annual${i}`, caption: i === 0 ? "Opening" : "" })),
    },
    { id: EMPTY, title: "No photos yet" },
  ]);
}

test.describe("gallery — visitors browse (007 US4)", () => {
  test.beforeEach(async () => {
    await clearGallery();
  });
  test.afterAll(async () => {
    await clearGallery();
  });

  test("cards on /resources, the album page, and the viewer by keyboard", async ({ page }) => {
    test.setTimeout(300_000);
    await seedTwo();
    await stubImages(page);
    await page.goto("/resources");
    await expect(page.getByRole("heading", { level: 1, name: galleryContent.resourcesBanner.title })).toBeVisible({ timeout: 90_000 });

    const section = page.locator("#photo-gallery");
    await expect(section.getByRole("heading", { name: galleryContent.sectionHeading })).toBeVisible();
    const cards = section.getByTestId("public-album-card");
    await expect(cards).toHaveCount(1); // the empty album is not shown
    await expect(cards.first()).toContainText("Annual Day");
    await expect(cards.first()).toContainText("8 photos");
    await expect(cards.first()).toContainText("12 March 2026");

    await cards.first().getByRole("link").click();
    await expect(page).toHaveURL(`/resources/gallery/${MAIN}`, { timeout: 90_000 });
    // The reference Photo Gallery page frame (screenshots/das.edu.pk_resources_photo-gallery_*.png).
    await expect(page.getByRole("heading", { level: 1, name: galleryContent.albumBanner.title })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveText(/Home\s*»\s*Resources\s*»\s*Photo Gallery/);
    await expect(page.getByTestId("album-page-title")).toHaveText("Annual Day");
    await expect(page.getByText("Prize giving and speeches")).toBeVisible();
    await expect(page.getByText(/Resources — /)).toHaveCount(0); // not the [slug] placeholder

    const first = page.getByRole("button", { name: galleryContent.openPhoto("Opening") });
    await first.click();
    const viewer = page.getByTestId("photo-viewer");
    await expect(viewer).toBeVisible();
    await expect(page.getByTestId("viewer-position")).toHaveText("1 of 8");
    await expect(page.getByTestId("viewer-caption")).toHaveText("Opening");
    for (let i = 0; i < 7; i += 1) await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("viewer-position")).toHaveText("8 of 8");
    await expect(viewer.getByRole("button", { name: galleryContent.viewer.next })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
    await expect(first).toBeFocused();

    await page.goBack();
    await expect(page).toHaveURL(/\/resources(#photo-gallery)?$/);
  });

  test("touch: swipe between photos and tap Close", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedTwo();
    const context = await browser.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await stubImages(page);
    await page.goto(`/resources/gallery/${MAIN}`);
    await page.getByRole("button", { name: galleryContent.openPhoto("Opening") }).tap();
    const viewer = page.getByTestId("photo-viewer");
    await expect(page.getByTestId("viewer-position")).toHaveText("1 of 8", { timeout: 60_000 });
    const box = (await viewer.boundingBox())!;
    const y = box.y + box.height / 2;
    await viewer.dispatchEvent("pointerdown", { clientX: box.x + 300, clientY: y, pointerType: "touch", bubbles: true });
    await viewer.dispatchEvent("pointerup", { clientX: box.x + 150, clientY: y, pointerType: "touch", bubbles: true });
    await expect(page.getByTestId("viewer-position")).toHaveText("2 of 8");
    await viewer.getByRole("button", { name: galleryContent.viewer.close }).tap();
    await expect(viewer).toBeHidden();
    await context.close();
  });

  test("an empty gallery hides the section; missing, deleted and empty albums are 404", async ({ page }) => {
    test.setTimeout(300_000);
    await seedAlbums([
      { id: EMPTY, title: "No photos yet" },
      { id: albumId("deleted"), title: "Deleted", deleted: true, photos: [{ name: "d" }] },
    ]);
    await page.goto("/resources");
    await expect(page.getByRole("heading", { level: 1, name: galleryContent.resourcesBanner.title })).toBeVisible({ timeout: 90_000 });
    await expect(page.locator("#photo-gallery")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: galleryContent.sectionHeading })).toHaveCount(0);

    for (const path of [`/resources/gallery/${EMPTY}`, `/resources/gallery/${albumId("deleted")}`, "/resources/gallery/zzzzzzzzzzzz", "/resources/gallery/NOT-AN-ID"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });

  test("redirects and the menu land on #photo-gallery", async ({ page }) => {
    test.setTimeout(300_000);
    await seedTwo();
    await stubImages(page);
    for (const path of ["/resources/gallery", "/resources/photo-gallery"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL("/resources#photo-gallery", { timeout: 90_000 });
    }
    await page.goto("/");
    const menuLink = page.locator('a[href="/resources#photo-gallery"]').first();
    await expect(menuLink).toHaveCount(1);
  });

  test("long and Urdu titles wrap; no horizontal scroll at 4 widths and the reference breakpoints", async ({ browser }) => {
    test.setTimeout(400_000);
    await seedAlbums([
      { id: MAIN, title: LONG_TITLE, photos: [{ name: "l0", caption: URDU }] },
      { id: albumId("urdu"), title: URDU, photos: [{ name: "u0" }] },
    ]);
    for (const width of [375, 480, 640, 768, 782, 1024, 1280, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await stubImages(page);
      for (const path of ["/resources", `/resources/gallery/${MAIN}`]) {
        await page.goto(path);
        await expect(page.locator("main")).toBeVisible({ timeout: 90_000 });
        expect(await hasNoHorizontalScroll(page), `${path} at ${width}px`).toBe(true);
      }
      await context.close();
    }
  });
});

test.describe("gallery — images load as the visitor scrolls (007 US5, FR-018, FR-032)", () => {
  test.afterAll(async () => {
    await clearGallery();
  });

  test("below-the-fold photos wait for scroll; delivered images are resized and compressed", async ({ browser }) => {
    test.setTimeout(300_000);
    await clearGallery();
    await seedTwo();
    const context = await browser.newContext({ viewport: { width: 375, height: 600 } });
    const page = await context.newPage();
    const requested: string[] = [];
    await page.route("https://res.cloudinary.com/**", (route) => {
      requested.push(route.request().url());
      return route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG });
    });
    await page.goto(`/resources/gallery/${MAIN}`);
    await expect(page.getByTestId("public-photo-grid")).toBeVisible({ timeout: 90_000 });
    // Every grid photo is natively lazy: the browser fetches each only as it nears the viewport. (With the
    // masonry layout all 8 small photos sit close to a 375×600 viewport, so how many are requested on load
    // depends on the browser's own distance threshold; the attribute is the contract.)
    const images = page.getByTestId("public-photo-grid").locator("img");
    await expect(images).toHaveCount(8);
    expect(await images.evaluateAll((els) => els.map((e) => e.getAttribute("loading")))).toEqual(Array(8).fill("lazy"));

    await page.getByTestId("public-photo-grid").locator("li").last().scrollIntoViewIfNeeded();
    await expect.poll(() => new Set(requested.map((u) => u.match(/annual(\d)/)?.[1]).filter(Boolean)).size, { timeout: 30_000 }).toBe(8);

    for (const url of requested) expect(url, url).toMatch(/\/image\/upload\/f_auto,q_auto,c_limit,w_\d+\//);
    await context.close();
  });
});

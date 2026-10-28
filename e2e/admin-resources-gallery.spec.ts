import { test, expect, type Page } from "@playwright/test";
import { albumId, clearGallery, seedAlbums } from "./helpers/gallery";
import { PIXEL_PNG } from "./helpers/pixel";
import { waitForScrollSettled } from "./helpers/scroll";

/**
 * The Resources page with a seeded gallery: the Photo Gallery comes first, then the School App
 * section (023, which is always there); the menu entries land clear of the header, and the
 * Photo Gallery is left out when empty. Named
 * admin-* so it runs in the serial admin project, which owns the one shared
 * gallery document.
 */

const stubImages = (page: Page) =>
  page.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG }));

const seed = () =>
  seedAlbums([{ id: albumId("annualday"), title: "Annual Day", photos: Array.from({ length: 3 }, (_, i) => ({ name: `annual${i}` })) }]);

async function landsClear(page: Page) {
  await waitForScrollSettled(page);
  const header = await page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().bottom);
  const r = await page.locator("section#photo-gallery h2").evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, vh: window.innerHeight };
  });
  expect(r.top).toBeGreaterThanOrEqual(header - 1);
  expect(r.bottom).toBeLessThanOrEqual(r.vh);
}

test.describe.configure({ mode: "serial" });
test.afterAll(async () => {
  await clearGallery();
});

test("with a gallery, the page has the Photo Gallery and then the School App section", async ({ page }) => {
  await seed();
  await stubImages(page);
  await page.goto("/resources");
  expect(await page.locator("main section").evaluateAll((els) => els.map((e) => e.id))).toEqual(["photo-gallery", "mobile-apps"]);
  await expect(page.locator("section#photo-gallery")).toHaveAttribute("data-background", "surface");
});

test.describe("menu entry lands clear of the header", () => {
  test.describe("desktop", () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test("dropdown lists Photo Gallery and School App", async ({ page }) => {
      await seed();
      await stubImages(page);
      await page.goto("/contact");
      const nav = page.getByRole("navigation", { name: "Main menu" });
      await nav.getByRole("link", { name: "Resources", exact: true }).hover();
      expect((await nav.locator('a[href^="/resources#"]').allTextContents()).map((t) => t.trim())).toEqual(["Photo Gallery", "School App"]);
      await nav.getByRole("link", { name: "Photo Gallery", exact: true }).click();
      await expect(page).toHaveURL(/\/resources#photo-gallery$/);
      await landsClear(page);
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 800 } });
    test("group lists Photo Gallery and School App", async ({ page }) => {
      await seed();
      await stubImages(page);
      await page.goto("/contact");
      await page.getByRole("button", { name: /menu/i }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Resources" }).click();
      expect((await dialog.locator('a[href^="/resources#"]').allTextContents()).map((t) => t.trim())).toEqual(["Photo Gallery", "School App"]);
      await dialog.locator('a[href="/resources#photo-gallery"]').click();
      await expect(page).toHaveURL(/\/resources#photo-gallery$/);
      await landsClear(page);
    });
  });
});

test("without a gallery, the Photo Gallery section is left out and only the School App section remains", async ({ page }) => {
  await clearGallery();
  await page.goto("/resources");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resources");
  expect(await page.locator("main section").evaluateAll((els) => els.map((e) => e.id))).toEqual(["mobile-apps"]);
});

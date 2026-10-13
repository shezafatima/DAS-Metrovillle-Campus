import { test, expect, type Page } from "@playwright/test";
import { albumId, clearGallery, seedAlbums } from "./helpers/gallery";
import { PIXEL_PNG } from "./helpers/pixel";
import { waitForScrollSettled } from "./helpers/scroll";

/**
 * 019 Resources with a seeded gallery: section order, both menu anchors and the
 * fixed backgrounds. Named admin-* so it runs in the serial admin project, which
 * owns the one shared gallery document.
 */

const stubImages = (page: Page) =>
  page.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG }));

const seed = () =>
  seedAlbums([{ id: albumId("annualday"), title: "Annual Day", photos: Array.from({ length: 3 }, (_, i) => ({ name: `annual${i}` })) }]);

async function landsClear(page: Page, id: string) {
  await waitForScrollSettled(page);
  const header = await page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().bottom);
  const r = await page.locator(`section#${id} h2`).evaluate((el) => {
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

test("with a gallery, Photo Gallery comes before Mobile Apps with fixed backgrounds", async ({ page }) => {
  await seed();
  await stubImages(page);
  await page.goto("/resources");
  expect(await page.locator("main section").evaluateAll((els) => els.map((e) => e.id))).toEqual(["photo-gallery", "mobile-apps"]);
  await expect(page.locator("section#photo-gallery")).toHaveAttribute("data-background", "surface");
  await expect(page.locator("section#mobile-apps")).toHaveAttribute("data-background", "muted");
});

test.describe("both menu entries land clear of the header", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("desktop dropdown", async ({ page }) => {
    await seed();
    await stubImages(page);
    for (const [label, id] of [
      ["Photo Gallery", "photo-gallery"],
      ["Mobile Apps", "mobile-apps"],
    ]) {
      await page.goto("/contact");
      const nav = page.getByRole("navigation", { name: "Main menu" });
      await nav.getByRole("link", { name: "Resources", exact: true }).hover();
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/resources#${id}$`));
      await landsClear(page, id);
    }
  });
});

test.describe("mobile group", () => {
  test.use({ viewport: { width: 375, height: 800 } });
  test("both entries land clear of the header", async ({ page }) => {
    await seed();
    await stubImages(page);
    for (const id of ["photo-gallery", "mobile-apps"]) {
      await page.goto("/contact");
      await page.getByRole("button", { name: /menu/i }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Resources" }).click();
      await dialog.locator(`a[href="/resources#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/resources#${id}$`));
      await landsClear(page, id);
    }
  });
});

test("without a gallery, Mobile Apps is the only section and stays muted", async ({ page }) => {
  await clearGallery();
  await page.goto("/resources");
  await expect(page.locator("section#photo-gallery")).toHaveCount(0);
  expect(await page.locator("main section").evaluateAll((els) => els.map((e) => e.id))).toEqual(["mobile-apps"]);
  await expect(page.locator("section#mobile-apps")).toHaveAttribute("data-background", "muted");
});

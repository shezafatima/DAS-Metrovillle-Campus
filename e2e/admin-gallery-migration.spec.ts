import { test, expect } from "@playwright/test";
import { clearGallery, readGallery, seedFlatGallery } from "./helpers/gallery";
import { PIXEL_PNG } from "./helpers/pixel";

/**
 * The lazy migration path (007 US3): with the release step forgotten, the
 * first read of the gallery moves the 005 flat photos into albums. Runs in the
 * serial admin project (it shares the gallery document); no sign-in needed.
 */
test.describe("gallery — existing photos move into albums (007 US3)", () => {
  test.beforeEach(async () => {
    await clearGallery();
  });
  test.afterAll(async () => {
    await clearGallery();
  });

  test("the first visit to /resources migrates 10 flat photos into 'Gallery' and 'Gallery 2'", async ({ page }) => {
    test.setTimeout(300_000);
    await seedFlatGallery(10, 1);
    await page.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG }));

    await page.goto("/resources");
    const cards = page.locator("#photo-gallery").getByTestId("public-album-card");
    await expect(cards).toHaveCount(2, { timeout: 90_000 });
    await expect(cards.nth(0)).toContainText("Gallery");
    await expect(cards.nth(0)).toContainText("8 photos");
    await expect(cards.nth(1)).toContainText("Gallery 2");
    await expect(cards.nth(1)).toContainText("2 photos");

    await cards.nth(0).getByRole("link").click();
    const captions = page.getByTestId("public-photo-grid").locator("li button span");
    await expect(captions).toHaveText(Array.from({ length: 8 }, (_, i) => `Flat photo ${i + 1}`), { timeout: 90_000 });

    const stored = await readGallery();
    expect(stored?.schema).toBe(2);
    expect(stored?.migration).toMatchObject({ migrated: 10, notMigrated: 0 });
    expect(JSON.stringify(stored?.albums)).not.toContain("Deleted 1");
  });
});

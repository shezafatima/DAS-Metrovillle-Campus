import { test, expect } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import { submitLogin } from "./helpers/users";
import { albumId, clearGallery, hasNoHorizontalScroll, seedAlbums } from "./helpers/gallery";
import { PIXEL_PNG } from "./helpers/pixel";
import { galleryCopy } from "../src/content/admin";

/**
 * Admin gallery layout (007 FR-027, Constitution XI): no sideways scroll and
 * no overlapping controls at the four standard widths and at the reference
 * site's own breakpoints (research/design-tokens.md "Container widths &
 * breakpoints"), with a long title, an Urdu title and caption, 1 photo and 8.
 */
const WIDTHS = [375, 480, 640, 768, 782, 1024, 1280, 1440];
const LONG = albumId("longtitle");
const URDU = albumId("urdutitle");
const LONG_TITLE = "x".repeat(20) + " a very long album title that goes on to the eighty character limit ok";

test.describe("gallery — admin layout (007)", () => {
  test.beforeAll(async () => {
    await clearGallery();
    await seedAlbums([
      { id: LONG, title: LONG_TITLE.slice(0, 80), photos: Array.from({ length: 8 }, (_, i) => ({ name: `lay${i}`, caption: i === 0 ? "سالانہ تقریب" : "" })) },
      { id: URDU, title: "سالانہ تقریب تقسیم انعامات", photos: [{ name: "one" }] },
    ]);
  });
  test.afterAll(async () => {
    await clearGallery();
  });

  test("album list, album screen and details panel fit every width", async ({ browser }) => {
    test.setTimeout(900_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG }));
    await submitLogin(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await expect(page).toHaveURL("/admin", { timeout: 90_000 });

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });

      await page.goto("/admin/settings/gallery");
      await expect(page.getByTestId("album-list")).toBeVisible({ timeout: 90_000 });
      expect(await hasNoHorizontalScroll(page), `album list at ${width}px`).toBe(true);

      await page.getByRole("button", { name: `${galleryCopy.edit}: ${LONG_TITLE.slice(0, 80)}` }).click();
      const panel = page.getByTestId("album-panel");
      await expect(panel).toBeVisible();
      expect(await hasNoHorizontalScroll(page), `details panel at ${width}px`).toBe(true);
      const save = await panel.getByRole("button", { name: galleryCopy.save }).boundingBox();
      const cancel = await panel.getByRole("button", { name: galleryCopy.cancel }).boundingBox();
      expect(save && cancel && !overlaps(save, cancel), `panel buttons overlap at ${width}px`).toBe(true);
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();

      for (const id of [LONG, URDU]) {
        await page.goto(`/admin/settings/gallery/${id}`);
        await expect(page.getByTestId("album-photos")).toBeVisible({ timeout: 90_000 });
        expect(await hasNoHorizontalScroll(page), `album ${id} at ${width}px`).toBe(true);
      }
    }
    await context.close();
  });
});

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

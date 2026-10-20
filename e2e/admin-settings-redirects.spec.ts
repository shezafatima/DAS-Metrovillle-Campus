import { test, expect } from "@playwright/test";
import { adminSession, loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";
import { albumId, clearGallery, seedAlbums } from "./helpers/gallery";
import { OLD_SETTINGS_URLS, oldAlbumUrl } from "./helpers/settings";

/**
 * 014 US3: every old Settings URL lands on its new tab and panel, with all
 * three access cases (contracts/access-matrix.md). The URL table lives in
 * helpers/settings.ts, so the access-matrix spec lists the same cases.
 */

const ALBUM_ID = albumId("redirect");
const ALL = [...OLD_SETTINGS_URLS, oldAlbumUrl(ALBUM_ID)];

test.describe("old Settings URLs (014 US3)", () => {
  test.beforeAll(async () => {
    await clearGallery();
    await seedAlbums([{ id: ALBUM_ID, title: "Redirect album" }]);
  });
  test.beforeEach(async () => {
    await resetUsers();
  });

  test("each old URL answers with a permanent redirect to its new address", async ({ request }) => {
    for (const url of ALL) {
      const response = await request.get(url.from, { maxRedirects: 0 });
      expect(response.status(), url.from).toBe(308);
      expect(response.headers().location, url.from).toBe(url.hash ? `${url.to}#${url.hash}` : url.to);
    }
  });

  test("no session: following an old URL ends at the login page for the destination", async ({ page }) => {
    test.setTimeout(400_000);
    for (const url of ALL) {
      await page.goto(url.from);
      await expect(page, url.from).toHaveURL(/\/admin\/login\?next=/, { timeout: 90_000 });
      expect(new URL(page.url()).searchParams.get("next"), url.from).toBe(url.to);
    }
  });

  test("missing permission: the destination's refusal", async ({ browser }) => {
    test.setTimeout(400_000);
    const pagesOnly = await loginSeeded(browser, await seedActiveUser({ email: "redirect-pages@example.test", permissions: ["pages"] }));
    const settingsOnly = await loginSeeded(browser, await seedActiveUser({ email: "redirect-settings@example.test", permissions: ["settings"] }));
    for (const url of ALL) {
      const { page } = url.needs === "settings" ? pagesOnly : settingsOnly;
      await page.goto(url.from);
      // The browser keeps the old URL's fragment through both redirects.
      await expect(page, url.from).toHaveURL(url.hash ? `/admin?denied=1#${url.hash}` : "/admin?denied=1", { timeout: 90_000 });
    }
  });

  test("correct permission: the new tab, with the named panel open and in view", async ({ browser }) => {
    test.setTimeout(400_000);
    const { page } = await adminSession(browser);
    for (const url of ALL) {
      await page.goto(url.from);
      await expect(page, url.from).toHaveURL(url.hash ? `${url.to}#${url.hash}` : url.to, { timeout: 90_000 });
      if (url.hash) {
        await expect(page.locator(`#${url.hash}-body`), url.from).toBeVisible({ timeout: 90_000 });
        await expect(page.locator(`#${url.hash}`), url.from).toBeInViewport();
      } else {
        await expect(page.getByText("Redirect album").first()).toBeVisible({ timeout: 90_000 });
      }
    }
  });
});

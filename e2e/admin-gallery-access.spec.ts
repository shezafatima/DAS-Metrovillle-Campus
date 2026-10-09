import { test, expect, type Page } from "@playwright/test";
import { adminSession, loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";
import { albumId, clearGallery, seedAlbums } from "./helpers/gallery";
import { accessCopy } from "../src/content/admin";

const ID = albumId("access");
const PATHS = ["/admin/settings/gallery", `/admin/settings/gallery/${ID}`];

async function expectDenied(page: Page, path: string) {
  await page.goto(path);
  await expect(page, path).toHaveURL("/admin?denied=1");
  await expect(page.getByText(accessCopy.denied)).toBeVisible();
}

test.describe("gallery — access (007 US5, Constitution XI)", () => {
  test.beforeEach(async () => {
    await resetUsers();
    await clearGallery();
    await seedAlbums([{ id: ID, title: "Access album", photos: [{ name: "a" }] }]);
  });
  test.afterAll(async () => {
    await clearGallery();
  });

  test("signed out: both gallery pages go to the login page", async ({ page }) => {
    for (const path of PATHS) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/login/);
    }
  });

  test("a content manager without settings is redirected from both pages", async ({ browser }) => {
    test.setTimeout(300_000);
    const user = await seedActiveUser({ email: "gallery-none@example.test", permissions: ["news"] });
    const { page } = await loginSeeded(browser, user);
    for (const path of PATHS) await expectDenied(page, path);
  });

  test("a content manager with settings, and the main admin, can use both pages", async ({ browser }) => {
    test.setTimeout(300_000);
    const user = await seedActiveUser({ email: "gallery-yes@example.test", permissions: ["settings"] });
    for (const session of [await loginSeeded(browser, user), await adminSession(browser)]) {
      await session.page.goto(PATHS[0]);
      await expect(session.page.getByTestId("album-list")).toBeVisible({ timeout: 90_000 });
      await session.page.goto(PATHS[1]);
      await expect(session.page.getByTestId("album-photos")).toBeVisible({ timeout: 90_000 });
    }
  });

  test("an unknown or deleted album's admin page is not found", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedAlbums([{ id: ID, title: "Gone", deleted: true }]);
    const { page } = await adminSession(browser);
    for (const path of [`/admin/settings/gallery/${ID}`, "/admin/settings/gallery/zzzzzzzzzzzz", "/admin/settings/gallery/BAD"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });
});

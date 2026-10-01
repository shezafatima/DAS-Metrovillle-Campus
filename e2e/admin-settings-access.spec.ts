import { test, expect, type Page } from "@playwright/test";
import { adminSession, loginSeeded, resetUsers, seedActiveUser, sidebarLabels } from "./helpers/users";
import { clearSettings, openGroup, readSettingsGroup, savedToast } from "./helpers/settings";
import { accessCopy, settingsCopy } from "../src/content/admin";

const GROUP_PATHS = ["contact", "hero", "stats", "video"].map((g) => `/admin/settings/${g}`);
// 007: the gallery lives in Settings but is no longer a group form (see admin-gallery-access.spec.ts).
const GALLERY_PATH = "/admin/settings/gallery";

async function expectDenied(page: Page, path: string) {
  await page.goto(path);
  await expect(page, path).toHaveURL("/admin?denied=1");
  await expect(page.getByText(accessCopy.denied)).toBeVisible();
}

test.describe("settings — permission-gated (005 US1)", () => {
  test.beforeEach(async () => {
    await resetUsers();
    await clearSettings();
  });

  test("signed out, every settings page goes to the login page and returns afterwards", async ({ page }) => {
    for (const path of ["/admin/settings", ...GROUP_PATHS, GALLERY_PATH]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/login/);
    }
  });

  test("a content manager without settings does not see it, is redirected from every page, and is refused the requests", async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    const user = await seedActiveUser({ email: "settings-none@example.test", permissions: ["news"] });
    const { page } = await loginSeeded(browser, user);

    expect(await sidebarLabels(page)).toEqual(["Overview", "News"]);

    for (const path of ["/admin/settings", ...GROUP_PATHS, GALLERY_PATH]) await expectDenied(page, path);

    const sign = await page.request.post("/api/admin/settings/uploads/sign", { data: { kind: "gallery" } });
    expect(sign.status()).toBe(403);
    expect(await sign.json()).toEqual({ error: "forbidden" });
    expect(await readSettingsGroup("stats")).toBeNull();
  });

  test("a content manager with settings sees the section, opens every group and saves Stats", async ({ browser }) => {
    test.setTimeout(300_000);
    const user = await seedActiveUser({ email: "settings-yes@example.test", permissions: ["settings"] });
    const { page } = await loginSeeded(browser, user);

    expect(await sidebarLabels(page)).toEqual(["Overview", "Settings"]);

    await page.goto("/admin/settings");
    await expect(page).toHaveURL("/admin/settings/contact", { timeout: 90_000 });
    const nav = page.getByRole("navigation", { name: settingsCopy.navLabel });
    for (const key of ["contact", "hero", "stats", "video", "gallery"] as const) {
      await expect(nav.getByRole("link", { name: settingsCopy.groups[key].title })).toBeVisible();
    }

    await openGroup(page, "stats");
    await page.getByLabel("Students").fill("310000");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Stats")).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("stats"))?.data).toMatchObject({ students: 310000 });

    const sign = await page.request.post("/api/admin/settings/uploads/sign", { data: { kind: "gallery" } });
    expect(sign.status()).toBe(200);
    expect(JSON.stringify(await sign.json())).not.toMatch(/secret/i);
  });

  test("the main admin can use every group", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    for (const path of GROUP_PATHS) {
      await page.goto(path);
      await expect(page, path).toHaveURL(path);
      await expect(page.locator("#admin-content form")).toBeVisible({ timeout: 90_000 });
    }
  });
});

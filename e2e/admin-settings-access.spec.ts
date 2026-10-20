import { test, expect, type Page } from "@playwright/test";
import { adminSession, loginSeeded, resetUsers, seedActiveUser, sidebarLabels } from "./helpers/users";
import { clearSettings, openGroup, readSettingsGroup, savedToast } from "./helpers/settings";
import { accessCopy, settingsCopy } from "../src/content/admin";

// 014: the Settings pages are tabs (005's group pages redirect to them; see admin-settings-redirects.spec.ts).
const TAB_PATHS = ["/admin/settings/site-wide", "/admin/settings/home", "/admin/settings/admission", "/admin/settings/resources"];

async function expectDenied(page: Page, path: string) {
  await page.goto(path);
  await expect(page, path).toHaveURL("/admin?denied=1", { timeout: 90_000 });
  await expect(page.getByText(accessCopy.denied)).toBeVisible();
}

test.describe("settings — permission-gated (005 US1, on 014 tabs)", () => {
  test.beforeEach(async () => {
    await resetUsers();
    await clearSettings();
  });

  test("signed out, every settings page goes to the login page", async ({ page }) => {
    for (const path of ["/admin/settings", ...TAB_PATHS]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/login/);
    }
  });

  test("a content manager with neither settings nor pages does not see it, is redirected from every page, and is refused the requests", async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    const user = await seedActiveUser({ email: "settings-none@example.test", permissions: ["news"] });
    const { page } = await loginSeeded(browser, user);

    expect(await sidebarLabels(page)).toEqual(["Overview", "News"]);
    for (const path of ["/admin/settings", ...TAB_PATHS]) await expectDenied(page, path);

    const sign = await page.request.post("/api/admin/settings/uploads/sign", { data: { kind: "gallery" } });
    expect(sign.status()).toBe(403);
    expect(await sign.json()).toEqual({ error: "forbidden" });
    expect(await readSettingsGroup("stats")).toBeNull();
  });

  test("a content manager with pages sees Settings, opens the page tabs and saves the stats", async ({ browser }) => {
    test.setTimeout(300_000);
    const user = await seedActiveUser({ email: "settings-yes@example.test", permissions: ["pages"] });
    const { page } = await loginSeeded(browser, user);

    expect(await sidebarLabels(page)).toEqual(["Overview", "Settings"]);

    await page.goto("/admin/settings");
    await expect(page).toHaveURL("/admin/settings/home", { timeout: 90_000 });

    const stats = await openGroup(page, "stats");
    await stats.getByLabel("Students").fill("310000");
    await stats.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, settingsCopy.panels.stats)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("stats"))?.data).toMatchObject({ students: 310000 });

    const sign = await page.request.post("/api/admin/settings/uploads/sign", { data: { kind: "gallery" } });
    expect(sign.status()).toBe(200);
    expect(JSON.stringify(await sign.json())).not.toMatch(/secret/i);
  });

  test("the main admin can open every tab", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    for (const path of TAB_PATHS) {
      await page.goto(path);
      await expect(page, path).toHaveURL(path);
      await expect(page.locator('section[data-testid="settings-panel"]').first()).toBeVisible({ timeout: 90_000 });
    }
  });
});

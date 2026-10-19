import { test, expect } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import { adminSession, loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";
import { clearSettings, openGroup, readSettingsGroup, savedToast } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

// 014: groups are panels on page tabs; a panel's toast and title are the public section's name.
const STATS = settingsCopy.panels.stats;
const CONTACT = settingsCopy.panels.contact;

test.describe("settings — saving and publishing (005 US7, on 014 tabs)", () => {
  test.beforeEach(async () => {
    await resetUsers();
    await clearSettings();
  });
  test.afterEach(async () => {
    await clearSettings();
  });

  test("two admins on the same panel: the second save is refused, their edit stays on screen, the first save is kept", async ({
    browser,
  }) => {
    test.setTimeout(400_000);
    const first = await adminSession(browser);
    // 014: the stats are page content (Pages).
    const other = await seedActiveUser({ email: "settings-second@example.test", permissions: ["pages"] });
    const second = await loginSeeded(browser, other);

    const firstStats = await openGroup(first.page, "stats");
    const secondStats = await openGroup(second.page, "stats");

    await firstStats.getByLabel("Students").fill("111");
    await firstStats.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(first.page, STATS)).toBeVisible({ timeout: 60_000 });

    await secondStats.getByLabel("Students").fill("222");
    await secondStats.getByRole("button", { name: "Save" }).click();
    await expect(second.page.getByText(settingsCopy.toasts.conflict)).toBeVisible({ timeout: 60_000 });
    await expect(secondStats.getByLabel("Students")).toHaveValue("222");

    const stored = await readSettingsGroup("stats");
    expect(stored?.data).toMatchObject({ students: 111 });
    expect(stored?.version).toBe(1);
    expect(stored?.updatedBy).toBe(E2E_ADMIN.email);
  });

  test("each panel saves on its own", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const stats = await openGroup(page, "stats");
    await stats.getByLabel("Books").fill("77");
    await stats.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, STATS)).toBeVisible({ timeout: 60_000 });

    expect(await readSettingsGroup("stats")).not.toBeNull();
    expect(await readSettingsGroup("contact")).toBeNull();
    expect(await readSettingsGroup("hero")).toBeNull();
    await expect(stats.getByTestId("last-saved")).toContainText(`Last saved by ${E2E_ADMIN.email}`);
  });

  test("leaving a tab with unsaved changes warns first; a saved tab does not", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const contact = await openGroup(page, "contact");
    const bar = page.getByRole("navigation", { name: settingsCopy.tabsNavLabel });

    // No changes: no warning.
    const prompts: string[] = [];
    page.on("dialog", (dialog) => {
      prompts.push(dialog.message());
      void dialog.dismiss();
    });
    await bar.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/admin/settings/home", { timeout: 90_000 });
    expect(prompts).toEqual([]);

    // An edit: the switch is stopped and the edit is still there.
    await bar.getByRole("link", { name: "Site-wide" }).click();
    await expect(page).toHaveURL("/admin/settings/site-wide", { timeout: 90_000 });
    await contact.getByLabel("Phone").fill("+92-300-9999999");
    await bar.getByRole("link", { name: "Home" }).click();
    await expect.poll(() => prompts.length).toBe(1);
    expect(prompts[0]).toBe(settingsCopy.unsavedPrompt);
    await expect(page).toHaveURL("/admin/settings/site-wide");
    await expect(contact.getByLabel("Phone")).toHaveValue("+92-300-9999999");

    // Saved: switching is free again.
    await contact.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, CONTACT)).toBeVisible({ timeout: 60_000 });
    await bar.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/admin/settings/home", { timeout: 90_000 });
    expect(prompts).toHaveLength(1);
  });

  test("a failed save keeps every edit", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const stats = await openGroup(page, "stats");
    await stats.getByLabel("Students").fill("4242");

    // The Server Action request fails on the way to the server.
    await page.route("**/admin/settings/home", (route) => {
      const isAction = route.request().method() === "POST" && "next-action" in route.request().headers();
      return isAction ? route.fulfill({ status: 500, body: "boom" }) : route.continue();
    });
    await stats.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(settingsCopy.toasts.unavailable)).toBeVisible({ timeout: 60_000 });
    await expect(stats.getByLabel("Students")).toHaveValue("4242");
    expect(await readSettingsGroup("stats")).toBeNull();

    // Once the network is back, the same edit saves.
    await page.unroute("**/admin/settings/home");
    await stats.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, STATS)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("stats"))?.data).toMatchObject({ students: 4242 });
  });

  test("a saved change is on the live site straight away, without a redeploy", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const contact = await openGroup(page, "contact");
    await contact.getByLabel("Phone").fill("+92-300-7777777");
    await contact.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, CONTACT)).toBeVisible({ timeout: 60_000 });

    // A visitor with no session.
    const visitor = await browser.newContext();
    const response = await visitor.request.get("/contact");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("+92-300-7777777");
    await visitor.close();
  });
});

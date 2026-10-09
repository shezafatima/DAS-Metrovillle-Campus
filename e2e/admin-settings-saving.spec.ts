import { test, expect } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import { adminSession, loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";
import { clearSettings, openGroup, readSettingsGroup, savedToast } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

test.describe("settings — saving and publishing (005 US7)", () => {
  test.beforeEach(async () => {
    await resetUsers();
    await clearSettings();
  });
  test.afterEach(async () => {
    await clearSettings();
  });

  test("two admins on the same group: the second save is refused, their edit stays on screen, the first save is kept", async ({
    browser,
  }) => {
    test.setTimeout(400_000);
    const first = await adminSession(browser);
    const other = await seedActiveUser({ email: "settings-second@example.test", permissions: ["settings"] });
    const second = await loginSeeded(browser, other);

    await openGroup(first.page, "stats");
    await openGroup(second.page, "stats");

    await first.page.getByLabel("Students").fill("111");
    await first.page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(first.page, settingsCopy.groups.stats.title)).toBeVisible({ timeout: 60_000 });

    await second.page.getByLabel("Students").fill("222");
    await second.page.getByRole("button", { name: "Save" }).click();
    await expect(second.page.getByText(settingsCopy.toasts.conflict)).toBeVisible({ timeout: 60_000 });
    await expect(second.page.getByLabel("Students")).toHaveValue("222");

    const stored = await readSettingsGroup("stats");
    expect(stored?.data).toMatchObject({ students: 111 });
    expect(stored?.version).toBe(1);
    expect(stored?.updatedBy).toBe(E2E_ADMIN.email);
  });

  test("each group saves on its own", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "stats");
    await page.getByLabel("Books").fill("77");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, settingsCopy.groups.stats.title)).toBeVisible({ timeout: 60_000 });

    expect(await readSettingsGroup("stats")).not.toBeNull();
    expect(await readSettingsGroup("contact")).toBeNull();
    expect(await readSettingsGroup("hero")).toBeNull();
    await expect(page.getByTestId("last-saved")).toContainText(`Last saved by ${E2E_ADMIN.email}`);
  });

  test("leaving a group with unsaved changes warns first; a saved group does not", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "contact");
    const nav = page.getByRole("navigation", { name: settingsCopy.navLabel });

    // No changes: no warning.
    const prompts: string[] = [];
    page.on("dialog", (dialog) => {
      prompts.push(dialog.message());
      void dialog.dismiss();
    });
    await nav.getByRole("link", { name: settingsCopy.groups.stats.title }).click();
    await expect(page).toHaveURL("/admin/settings/stats", { timeout: 90_000 });
    expect(prompts).toEqual([]);

    // An edit: the switch is stopped and the edit is still there.
    await nav.getByRole("link", { name: settingsCopy.groups.contact.title }).click();
    await expect(page).toHaveURL("/admin/settings/contact", { timeout: 90_000 });
    await page.getByLabel("Phone").fill("+92-300-9999999");
    await nav.getByRole("link", { name: settingsCopy.groups.hero.title }).click();
    await expect.poll(() => prompts.length).toBe(1);
    expect(prompts[0]).toBe(settingsCopy.unsavedPrompt);
    await expect(page).toHaveURL("/admin/settings/contact");
    await expect(page.getByLabel("Phone")).toHaveValue("+92-300-9999999");

    // Saved: switching is free again.
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, settingsCopy.groups.contact.title)).toBeVisible({ timeout: 60_000 });
    await nav.getByRole("link", { name: settingsCopy.groups.hero.title }).click();
    await expect(page).toHaveURL("/admin/settings/hero", { timeout: 90_000 });
    expect(prompts).toHaveLength(1);
  });

  test("a failed save keeps every edit", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "stats");
    await page.getByLabel("Students").fill("4242");

    // The Server Action request fails on the way to the server.
    await page.route("**/admin/settings/stats", (route) => {
      const isAction = route.request().method() === "POST" && "next-action" in route.request().headers();
      return isAction ? route.fulfill({ status: 500, body: "boom" }) : route.continue();
    });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(settingsCopy.toasts.unavailable)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel("Students")).toHaveValue("4242");
    expect(await readSettingsGroup("stats")).toBeNull();

    // Once the network is back, the same edit saves.
    await page.unroute("**/admin/settings/stats");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, settingsCopy.groups.stats.title)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("stats"))?.data).toMatchObject({ students: 4242 });
  });

  test("a saved change is on the live site straight away, without a redeploy", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "contact");
    await page.getByLabel("Phone").fill("+92-300-7777777");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, settingsCopy.groups.contact.title)).toBeVisible({ timeout: 60_000 });

    // A visitor with no session.
    const visitor = await browser.newContext();
    const response = await visitor.request.get("/contact");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("+92-300-7777777");
    await visitor.close();
  });
});

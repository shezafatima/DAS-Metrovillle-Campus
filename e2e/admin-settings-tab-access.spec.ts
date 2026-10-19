import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { loginSeeded, resetUsers, seedActiveUser, sidebarLabels } from "./helpers/users";
import { clearSettings, panel, readSettingsGroup } from "./helpers/settings";
import { accessCopy, settingsCopy } from "../src/content/admin";

/**
 * 014 US2: each tab has its own permission, and on the Admission tab each
 * panel has its own (contracts/access-matrix.md). Signed-in refusals land on
 * /admin?denied=1, the 011 forbidden outcome for pages.
 */

async function expectDenied(page: Page, path: string) {
  await page.goto(path);
  await expect(page, path).toHaveURL("/admin?denied=1", { timeout: 90_000 });
  await expect(page.getByText(accessCopy.denied)).toBeVisible();
}

async function tabLabels(page: Page): Promise<string[]> {
  return page.getByRole("navigation", { name: settingsCopy.tabsNavLabel }).getByRole("link").allTextContents();
}

async function expectReadOnly(page: Page, key: string, permission: string) {
  const section = panel(page, key);
  // Playwright's toBeDisabled ignores a fieldset's own disabled attribute, so check the attribute.
  await expect(section.locator("fieldset"), key).toHaveAttribute("disabled", "");
  await expect(section.getByRole("button", { name: "Save" }), key).toHaveCount(0);
  await expect(section.getByTestId("panel-read-only"), key).toHaveText(`You need the ${permission} permission to change this.`);
}

async function expectEditable(page: Page, key: string) {
  const section = panel(page, key);
  await expect(section.locator("fieldset"), key).not.toHaveAttribute("disabled");
  await expect(section.getByRole("button", { name: "Save" }), key).toBeVisible();
}

async function axeClean(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`), label).toEqual([]);
}

test.describe("settings by page — permissions (014 US2)", () => {
  test.beforeEach(async () => {
    await resetUsers();
    await clearSettings();
  });

  test("Pages only: Home, Admission and Resources; Site-wide refused; window and classes read-only", async ({ browser }) => {
    test.setTimeout(400_000);
    const user = await seedActiveUser({ email: "pages-only@example.test", permissions: ["pages"] });
    const { page } = await loginSeeded(browser, user);

    expect(await sidebarLabels(page)).toEqual(["Overview", "Settings"]);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL("/admin/settings/home", { timeout: 90_000 });
    expect(await tabLabels(page)).toEqual(["Home", "Admission", "Resources"]);

    await expectDenied(page, "/admin/settings/site-wide");

    await page.goto("/admin/settings/admission");
    await expect(panel(page, "admission-window").locator("form")).toBeVisible({ timeout: 90_000 });
    await expectReadOnly(page, "admission-window", "Settings");
    await expectReadOnly(page, "admission-classes", "Settings");
    await expectEditable(page, "admission-messages");
    await expect(panel(page, "admission-window").getByTestId("settings-status")).toBeVisible();
    await axeClean(page, "Admission, Pages only");

    // The messages save works; the dates and classes stay as they were.
    await panel(page, "admission-messages").getByLabel("Announcement").fill("Open for Class 1");
    await panel(page, "admission-messages").getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Admission messages saved").last()).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("admission"))?.data).toMatchObject({ announcement: "Open for Class 1", opensOn: "", closesOn: "", classes: [] });
  });

  test("Settings only: Site-wide and Admission; Home and Resources refused; messages read-only", async ({ browser }) => {
    test.setTimeout(400_000);
    const user = await seedActiveUser({ email: "settings-only@example.test", permissions: ["settings"] });
    const { page } = await loginSeeded(browser, user);

    await page.goto("/admin/settings");
    await expect(page).toHaveURL("/admin/settings/site-wide", { timeout: 90_000 });
    expect(await tabLabels(page)).toEqual(["Site-wide", "Admission"]);

    await expectDenied(page, "/admin/settings/home");
    await expectDenied(page, "/admin/settings/resources");

    await page.goto("/admin/settings/admission");
    await expect(panel(page, "admission-window").locator("form")).toBeVisible({ timeout: 90_000 });
    await expectEditable(page, "admission-window");
    await expectEditable(page, "admission-classes");
    await expectReadOnly(page, "admission-messages", "Page content");
    await axeClean(page, "Admission, Settings only");

    // Uploads are for hero slides and the gallery, both Pages now.
    const sign = await page.request.post("/api/admin/settings/uploads/sign", { data: { kind: "gallery" } });
    expect(sign.status()).toBe(403);
  });

  test("neither permission: no Settings in the sidebar and every Settings page refused", async ({ browser }) => {
    test.setTimeout(400_000);
    const user = await seedActiveUser({ email: "neither@example.test", permissions: ["news"] });
    const { page } = await loginSeeded(browser, user);
    expect(await sidebarLabels(page)).toEqual(["Overview", "News"]);
    for (const path of [
      "/admin/settings",
      "/admin/settings/site-wide",
      "/admin/settings/home",
      "/admin/settings/admission",
      "/admin/settings/resources",
    ]) {
      await expectDenied(page, path);
    }
  });
});

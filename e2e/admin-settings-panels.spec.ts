import { test, expect, type Page } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { clearSettings, fillStable, panel, readSettingsGroup } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

/**
 * 014 US4: never lose unsaved work. One leave warning per tab, a badge per
 * panel, and saves of sibling panels that never interfere (ADR-0013).
 */

async function openAdmission(page: Page) {
  await page.goto("/admin/settings/admission");
  await expect(panel(page, "admission-messages").locator("form")).toBeVisible({ timeout: 90_000 });
}

/** Counts the leave prompts and answers them. */
function dialogs(page: Page, accept: boolean) {
  let count = 0;
  page.on("dialog", (dialog) => {
    count += 1;
    void (accept ? dialog.accept() : dialog.dismiss());
  });
  return () => count;
}

test.describe("settings by page — unsaved work (014 US4)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });

  test("saving one Admission panel keeps the other's edits, badge and Save; then it saves without a conflict", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openAdmission(page);
    const messages = panel(page, "admission-messages");
    const windowPanel = panel(page, "admission-window");

    await fillStable(page, "Announcement", "Admissions are open");
    await fillStable(page, "Closes on", "2027-03-31");
    await expect(messages.getByTestId("panel-unsaved")).toBeVisible();
    await expect(windowPanel.getByTestId("panel-unsaved")).toBeVisible();

    await messages.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Admission messages saved").last()).toBeVisible({ timeout: 60_000 });
    // Let the refresh after the save land before checking the sibling.
    await page.waitForLoadState("networkidle");
    await expect(messages.getByTestId("panel-unsaved")).toHaveCount(0);
    await expect(windowPanel.getByLabel("Closes on")).toHaveValue("2027-03-31");
    await expect(windowPanel.getByTestId("panel-unsaved")).toBeVisible();
    await expect(windowPanel.getByRole("button", { name: "Save" })).toBeEnabled();

    await windowPanel.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Admission window saved").last()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(settingsCopy.toasts.conflict)).toHaveCount(0);
    expect((await readSettingsGroup("admission"))?.data).toMatchObject({ announcement: "Admissions are open", closesOn: "2027-03-31" });
  });

  test("a collapsed dirty panel still shows its badge; a long panel's header stays visible while scrolling", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/settings/home");
    const hero = panel(page, "hero");
    await expect(hero.locator("form")).toBeVisible({ timeout: 90_000 });
    await fillStable(page, "Seconds each slide is shown", "7");
    await expect(hero.getByTestId("panel-unsaved")).toBeVisible();

    // Scroll to the bottom of the hero panel: its header row (and badge) is still on screen.
    await hero.getByRole("button", { name: "Save" }).scrollIntoViewIfNeeded();
    await expect(hero.getByTestId("panel-unsaved")).toBeInViewport();

    await hero.getByRole("button", { name: "Hero slides" }).click();
    await expect(page.locator("#hero-body")).toBeHidden();
    await expect(hero.getByTestId("panel-unsaved")).toBeVisible();
  });

  test("leaving a tab with unsaved panels asks once; staying keeps the edits", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openAdmission(page);
    await fillStable(page, "Announcement", "Unsaved one");
    await fillStable(page, "Closed message", "Unsaved two");

    const prompts = dialogs(page, false);
    await page.getByRole("navigation", { name: settingsCopy.tabsNavLabel }).getByRole("link", { name: "Home" }).click();
    await expect.poll(prompts).toBe(1);
    await expect(page).toHaveURL("/admin/settings/admission");
    await expect(page.getByLabel("Announcement")).toHaveValue("Unsaved one");

    await panel(page, "admission-messages").getByTestId("view-on-site").click();
    await expect.poll(prompts).toBe(2);
    await expect(page).toHaveURL("/admin/settings/admission");
  });

  test("accepting the warning leaves the tab", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openAdmission(page);
    await fillStable(page, "Announcement", "Discard me");
    const prompts = dialogs(page, true);
    await page.getByRole("navigation", { name: settingsCopy.tabsNavLabel }).getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/admin/settings/home", { timeout: 90_000 });
    expect(prompts()).toBe(1);
  });

  test("two admins on the same panel: the stale save is refused and keeps its edits", async ({ browser }) => {
    test.setTimeout(400_000);
    const a = await adminSession(browser);
    const b = await adminSession(browser);
    await openAdmission(a.page);
    await openAdmission(b.page);

    await fillStable(a.page, "Announcement", "From A");
    await panel(a.page, "admission-messages").getByRole("button", { name: "Save" }).click();
    await expect(a.page.getByText("Admission messages saved").last()).toBeVisible({ timeout: 60_000 });

    await fillStable(b.page, "Announcement", "From B");
    await panel(b.page, "admission-messages").getByRole("button", { name: "Save" }).click();
    await expect(b.page.getByText(settingsCopy.toasts.conflict)).toBeVisible({ timeout: 60_000 });
    await expect(b.page.getByLabel("Announcement")).toHaveValue("From B");
    expect((await readSettingsGroup("admission"))?.data).toMatchObject({ announcement: "From A" });
  });
});

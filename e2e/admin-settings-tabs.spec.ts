import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { clearSettings, panel, readSettingsGroup, savedToast } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

/**
 * 014 US1 (tabs and panels) and US5 (the tab bar on phones), as the main admin.
 * contracts/tabs-and-panels.md is the source for every title, order and link.
 */

const TABS = [
  { path: "/admin/settings/site-wide", label: "Site-wide", panels: [["contact", "Contact & social", "/contact"]] },
  {
    path: "/admin/settings/home",
    label: "Home",
    panels: [
      ["hero", "Hero slides", "/#hero"],
      ["video", "Why Choose video", "/#why-choose"],
      ["stats", "Progress dashboard", "/#progress-dashboard"],
    ],
  },
  {
    path: "/admin/settings/admission",
    label: "Admission",
    panels: [
      ["admission-window", "Admission window", "/admission#admission-procedure"],
      ["admission-messages", "Admission messages", "/admission#admission-procedure"],
      ["admission-classes", "Classes open for admission", "/admission/register"],
    ],
  },
  { path: "/admin/settings/resources", label: "Resources", panels: [["photo-gallery", "Photo gallery", "/resources#photo-gallery"]] },
] as const;

test.describe("settings by page — tabs and panels (014 US1)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });

  test("Settings opens on Site-wide; the tab bar lists the four tabs with panels, in order", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL("/admin/settings/site-wide", { timeout: 90_000 });
    const bar = page.getByRole("navigation", { name: settingsCopy.tabsNavLabel });
    await expect(bar.getByRole("link")).toHaveText(TABS.map((tab) => tab.label));
    await expect(bar.getByRole("link", { name: "Site-wide" })).toHaveAttribute("aria-current", "page");
  });

  test("each tab holds the inventory's panels, in page order, with their View on site links", async ({ browser }) => {
    test.setTimeout(400_000);
    const { page } = await adminSession(browser);
    for (const tab of TABS) {
      await page.goto(tab.path);
      const panels = page.locator('section[data-testid="settings-panel"]');
      await expect(panels.first()).toBeVisible({ timeout: 90_000 });
      // Only the panel titles: a panel's form can have headings of its own (the hero's "Slides").
      await expect(panels.locator("> div > h2")).toHaveText(tab.panels.map(([, title]) => title));
      for (const [key, title, href] of tab.panels) {
        await expect(panel(page, key).getByTestId("view-on-site"), `${key} link`).toHaveAttribute("href", href);
        await expect(panel(page, key).getByRole("button", { name: title }), `${key} toggle`).toHaveAttribute("aria-expanded", "true");
      }
    }
  });

  test("View on site lands on the public section", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    for (const [key, , href] of TABS[1].panels) {
      await page.goto("/admin/settings/home");
      await panel(page, key).getByTestId("view-on-site").click();
      await expect(page).toHaveURL(href, { timeout: 90_000 });
      const id = href.split("#")[1];
      await expect(page.locator(`#${id}`)).toBeInViewport({ timeout: 30_000 });
    }
  });

  test("panels collapse with a click, Enter and Space, and keep their place in the page", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/settings/home");
    const toggle = panel(page, "stats").getByRole("button", { name: "Progress dashboard" });
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 90_000 });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#stats-body")).toBeHidden();
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("a fragment opens and scrolls to its panel", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/settings/home#stats");
    await expect(page.locator("#stats-body")).toBeVisible({ timeout: 90_000 });
    await expect(panel(page, "stats")).toBeInViewport();
  });

  test("saving a panel reaches the public site", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/settings/home#stats");
    const stats = panel(page, "stats");
    await expect(stats.locator("form")).toBeVisible({ timeout: 90_000 });
    await stats.getByLabel("Students").fill("321000");
    await stats.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Progress dashboard")).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("stats"))?.data).toMatchObject({ students: 321000 });
    await page.goto("/");
    await expect(page.getByTestId("progress-dashboard")).toContainText(/321/, { timeout: 90_000 });
  });

  test("About, Academics and Careers have no tab yet: their URLs are not found", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    for (const path of ["/admin/settings/about", "/admin/settings/academics", "/admin/settings/careers"]) {
      // A request, not a navigation: the dev server's compile reload can abort a navigation.
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
    }
  });

  test("a Home group that cannot be read fails in its own panel; the others still work", async ({ browser }) => {
    test.setTimeout(300_000);
    const { context, page } = await adminSession(browser);
    await context.addCookies([{ name: "e2e-settings-read-fail", value: "video", url: "http://localhost:3100" }]);
    await page.goto("/admin/settings/home");
    await expect(panel(page, "video").getByTestId("panel-unavailable")).toHaveText(settingsCopy.panelUnavailable, { timeout: 90_000 });
    await expect(panel(page, "video").locator("form")).toHaveCount(0);
    await expect(panel(page, "hero").locator("form")).toBeVisible();
    await expect(panel(page, "stats").locator("form")).toBeVisible();
  });

  test("axe finds no violations on any tab", async ({ browser }) => {
    test.setTimeout(400_000);
    const { page } = await adminSession(browser);
    for (const tab of TABS) {
      await page.goto(tab.path);
      await expect(page.locator('section[data-testid="settings-panel"]').first()).toBeVisible({ timeout: 90_000 });
      const result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`), tab.path).toEqual([]);
    }
  });
});

test.describe("settings tab bar on phones (014 US5)", () => {
  for (const width of [320, 375]) {
    test(`${width}px: one row that scrolls on its own; the active tab is in view; no page overflow`, async ({ browser }) => {
      test.setTimeout(300_000);
      const { page } = await adminSession(browser);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/admin/settings/resources");
      const bar = page.getByRole("navigation", { name: settingsCopy.tabsNavLabel });
      const links = bar.getByRole("link");
      await expect(links.first()).toBeVisible({ timeout: 90_000 });

      const tops = await links.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size, "one row").toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no page overflow").toBe(true);

      const active = bar.getByRole("link", { name: "Resources" });
      await expect(active).toHaveAttribute("aria-current", "page");
      const barBox = (await bar.boundingBox())!;
      const activeBox = (await active.boundingBox())!;
      expect(activeBox.x).toBeGreaterThanOrEqual(barBox.x - 1);
      expect(activeBox.x + activeBox.width).toBeLessThanOrEqual(barBox.x + barBox.width + 1);

      // Keyboard: focusing the first tab brings it back into view.
      await links.first().focus();
      const firstBox = (await links.first().boundingBox())!;
      expect(firstBox.x).toBeGreaterThanOrEqual(barBox.x - 1);
    });
  }
});

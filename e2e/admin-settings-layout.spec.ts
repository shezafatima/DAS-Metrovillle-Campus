import { test, expect, type Page } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { clearSettings, openGroup, type SettingsGroupKey } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

/**
 * FR-035 / Constitution XI: every Settings screen, and the slide panel, work
 * at 375, 768, 1024 and 1440 px with no sideways scrolling and no overlapping
 * controls.
 */
const WIDTHS = [375, 768, 1024, 1440];
const GROUPS: SettingsGroupKey[] = ["contact", "hero", "stats", "video"];

async function noSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function boxesDoNotOverlap(page: Page, selectors: string[]) {
  const boxes = [];
  for (const selector of selectors) {
    const box = await page.locator(selector).first().boundingBox();
    if (box) boxes.push({ selector, box });
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i].box;
      const b = boxes[j].box;
      const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlap, `${boxes[i].selector} overlaps ${boxes[j].selector}`).toBe(false);
    }
  }
}

test.describe("settings — layout at four widths (005 FR-035)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterEach(async () => {
    await clearSettings();
  });

  for (const width of WIDTHS) {
    test(`${width}px: every group page fits and its controls do not overlap`, async ({ browser }) => {
      test.setTimeout(400_000);
      const { page } = await adminSession(browser);
      await page.setViewportSize({ width, height: 900 });

      for (const group of GROUPS) {
        await openGroup(page, group);
        await noSidewaysScroll(page);
        await boxesDoNotOverlap(page, [`nav[aria-label="${settingsCopy.navLabel}"]`, "#admin-content form"]);
        const save = page.getByRole("button", { name: "Save" });
        await expect(save).toBeVisible();
        const box = await save.boundingBox();
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      }
    });

    test(`${width}px: the slide panel fits the screen`, async ({ browser }) => {
      test.setTimeout(300_000);
      const { page } = await adminSession(browser);
      await page.setViewportSize({ width, height: 900 });
      await openGroup(page, "hero");

      await page.getByRole("button", { name: "Add slide" }).click();
      const panel = page.getByRole("dialog", { name: "Add slide" });
      await expect(panel).toBeVisible();
      const box = await panel.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? -1) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 1);
      // Full width on a phone, a fixed comfortable width from 640px.
      if (width < 640) expect(box?.width ?? 0).toBeGreaterThanOrEqual(width - 5);
      else expect(box?.width ?? 0).toBeLessThan(width);
      await noSidewaysScroll(page);
    });
  }
});

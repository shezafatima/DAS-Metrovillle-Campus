import { test, expect, type Locator, type Page } from "@playwright/test";
import { clearThrottle } from "./global-setup";
import { loginAs } from "./helpers/account";
import { accountCopy } from "../src/content/admin";

const WIDTHS = [375, 768, 1024, 1440];

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("element has no bounding box");
  return b;
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

async function expectInsideViewport(page: Page, locator: Locator) {
  const b = await box(locator);
  const viewport = page.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(viewport.width);
}

test.describe("admin account — layout at 375 / 768 / 1024 / 1440 (010 FR-020)", () => {
  test.beforeEach(async () => {
    await clearThrottle();
  });

  test("profile control, profile menu and Account page fit at every width", async ({ page }) => {
    test.setTimeout(180_000);
    await loginAs(page);

    for (const width of WIDTHS) {
      await test.step(`${width}px`, async () => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/admin/account");
        await expectNoHorizontalScroll(page);

        // The profile control sits left of the bell, and nothing in the top bar overlaps.
        const profile = page.getByRole("button", { name: "Account menu" });
        const bell = page.getByRole("button", { name: "Notifications" });
        const profileBox = await box(profile);
        const bellBox = await box(bell);
        expect(profileBox.x).toBeLessThan(bellBox.x);
        expect(overlaps(profileBox, bellBox)).toBe(false);
        // The top bar's SidebarTrigger (the sidebar's edge rail shares its label on desktop).
        const sidebarTrigger = page.locator('[data-slot="sidebar-trigger"]');
        const triggerBox = await box(sidebarTrigger);
        expect(overlaps(triggerBox, profileBox)).toBe(false);
        expect(overlaps(triggerBox, bellBox)).toBe(false);

        // The menu opens fully on screen, closes on Escape (focus back) and on an outside click.
        await profile.click();
        const menu = page.getByRole("menu");
        await expect(menu).toBeVisible();
        await expectInsideViewport(page, menu);
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
        await expect(profile).toBeFocused();

        await profile.click();
        await expect(menu).toBeVisible();
        // Somewhere the menu (top right) never covers: lower middle of the page.
        const viewport = page.viewportSize()!;
        await page.mouse.click(Math.round(viewport.width / 2), viewport.height - 20);
        await expect(menu).toBeHidden();

        // Every field and button on the Account page is fully visible.
        for (const label of [
          accountCopy.changePassword.currentLabel,
          accountCopy.changePassword.newLabel,
          accountCopy.changePassword.confirmLabel,
        ]) {
          const field = page.getByLabel(label, { exact: true });
          await expect(field).toBeVisible();
          await expectInsideViewport(page, field);
        }
        for (const name of [accountCopy.changePassword.submit, accountCopy.signOutOthers.button]) {
          const button = page.getByRole("button", { name });
          await expect(button).toBeVisible();
          await expectInsideViewport(page, button);
        }
      });
    }
  });
});

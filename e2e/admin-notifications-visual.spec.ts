import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { seedMessages, clearMessages } from "./helpers/messages";
import { seedSignups, clearSignups } from "./helpers/signups";

const WIDTHS = [375, 768, 1024, 1440];

test.describe("admin notifications — visual", () => {
  test.beforeEach(async ({ page }) => {
    await clearMessages();
    await clearSignups();
    await clearAdminNotificationStates();
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, signupsLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
  });

  for (const width of WIDTHS) {
    test(`indicators render correctly at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await seedMessages([{ status: "new" }]);
      await seedSignups([{ name: "Sara", email: `sara-${width}@example.com`, phone: "+923001234567", sources: ["home"], lastSignupAt: new Date() }]);

      await page.goto("/admin");
      await expect(page.getByTestId("notification-bell-dot")).toBeVisible();

      // Below the `lg` breakpoint the sidebar is a closed-by-default
      // mobile drawer, not an inline nav — open it first.
      if (width < 1024) {
        await page.locator('[data-slot="sidebar-trigger"]').click();
      }
      await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).toBeVisible();
      await expect(page.getByRole("link", { name: "Signups" }).locator("..").getByText("1")).toBeVisible();
      if (width < 1024) {
        await page.keyboard.press("Escape");
      }

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // no horizontal scroll
    });
  }

  test("badges hide when nothing is new, at every width", async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin");
      await expect(page.getByTestId("notification-bell-dot")).not.toBeVisible();
      await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).not.toBeVisible();
    }
  });

  test("sidebar badges stay visible when collapsed to icons at 1024/1440", async ({ page }) => {
    await seedMessages([{ status: "new" }]);
    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin");
      await page.locator('[data-slot="sidebar-trigger"]').click();
      await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).toBeVisible();
    }
  });

  test("the bell popup is full width at 375px and a bounded dropdown at 768px+", async ({ page }) => {
    await seedMessages([{ status: "new" }]);

    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/admin");
    await page.getByRole("button", { name: "Notifications" }).click();
    const phonePanel = page.locator("[data-slot='popover-content']");
    expect((await phonePanel.boundingBox())!.width).toBeGreaterThan(300);
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 768, height: 900 });
    await page.getByRole("button", { name: "Notifications" }).click();
    const desktopPanel = page.locator("[data-slot='popover-content']");
    expect((await desktopPanel.boundingBox())!.width).toBeLessThan(450);
  });

  test("every count above 99 displays as 99+ in the sidebar and Overview (the bell itself only ever shows a dot)", async ({ page }) => {
    const seeds = Array.from({ length: 105 }, () => ({ status: "new" as const }));
    await seedMessages(seeds);

    await page.goto("/admin");
    await expect(page.getByTestId("notification-bell-dot")).toBeVisible();
    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("99+")).toBeVisible();

    const messagesCard = page.getByRole("heading", { name: "Messages" }).locator("..").locator("..");
    await expect(messagesCard.getByText("99+ new")).toBeVisible();
  });
});

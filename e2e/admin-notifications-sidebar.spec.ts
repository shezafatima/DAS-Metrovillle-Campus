import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { seedMessages, clearMessages } from "./helpers/messages";
import { seedCareerApplications, clearCareerApplications } from "./helpers/careers";

test.describe("admin notifications — sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await clearMessages();
    await clearCareerApplications();
    await clearAdminNotificationStates();
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, careersLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
  });

  test("sidebar badges sum to the bell's total", async ({ page }) => {
    await seedMessages([{ status: "new" }, { status: "new" }]);
    await seedCareerApplications([{ name: "Sara", email: "sara@example.com", phone: "+923001234567", createdAt: new Date() }]);

    await page.goto("/admin");
    const messagesItem = page.getByRole("link", { name: "Messages" }).locator("..");
    const applicationsItem = page.getByRole("link", { name: "Applications" }).locator("..");
    await expect(messagesItem.getByText("2")).toBeVisible();
    await expect(applicationsItem.getByText("1")).toBeVisible();

    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText("You're all caught up")).not.toBeVisible();
  });

  test("badges remain visible when the sidebar is collapsed to icons", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedMessages([{ status: "new" }]);
    await page.goto("/admin");
    await page.locator('[data-slot="sidebar-trigger"]').click();
    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).toBeVisible();
  });

  test("badges disappear once everything is read", async ({ page }) => {
    await seedMessages([{ status: "new" }]);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Notifications" }).click();
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).not.toBeVisible();
  });
});

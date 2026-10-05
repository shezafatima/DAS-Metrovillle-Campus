import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { seedMessages, clearMessages } from "./helpers/messages";
import { seedCareerApplications, clearCareerApplications } from "./helpers/careers";

test.describe("admin notifications — overview", () => {
  test.beforeEach(async ({ page }) => {
    await clearMessages();
    await clearCareerApplications();
    await clearAdminNotificationStates();
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, careersLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
  });

  test("Messages and Applications cards highlight the same new counts as the sidebar", async ({ page }) => {
    await seedMessages([{ status: "new" }, { status: "new" }]);
    await seedCareerApplications([{ name: "Sara", email: "sara-overview@example.com", phone: "+923001234567", createdAt: new Date() }]);

    await page.goto("/admin");
    const messagesCard = page.getByRole("heading", { name: "Messages" }).locator("..").locator("..");
    const applicationsCard = page.getByRole("heading", { name: "Applications" }).locator("..").locator("..");
    await expect(messagesCard.getByText("2 new")).toBeVisible();
    await expect(applicationsCard.getByText("1 new")).toBeVisible();

    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("2")).toBeVisible();
    await expect(page.getByRole("link", { name: "Applications" }).locator("..").getByText("1")).toBeVisible();
  });
});

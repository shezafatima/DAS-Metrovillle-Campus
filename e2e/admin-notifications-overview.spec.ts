import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { seedMessages, clearMessages } from "./helpers/messages";
import { seedSignups, clearSignups } from "./helpers/signups";

test.describe("admin notifications — overview", () => {
  test.beforeEach(async ({ page }) => {
    await clearMessages();
    await clearSignups();
    await clearAdminNotificationStates();
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, signupsLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
  });

  test("Messages and Signups cards highlight the same new counts as the sidebar", async ({ page }) => {
    await seedMessages([{ status: "new" }, { status: "new" }]);
    await seedSignups([{ name: "Sara", email: "sara-overview@example.com", phone: "+923001234567", sources: ["home"], lastSignupAt: new Date() }]);

    await page.goto("/admin");
    const messagesCard = page.getByRole("heading", { name: "Messages" }).locator("..").locator("..");
    const signupsCard = page.getByRole("heading", { name: "Signups" }).locator("..").locator("..");
    await expect(messagesCard.getByText("2 new")).toBeVisible();
    await expect(signupsCard.getByText("1 new")).toBeVisible();

    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("2")).toBeVisible();
    await expect(page.getByRole("link", { name: "Signups" }).locator("..").getByText("1")).toBeVisible();
  });
});

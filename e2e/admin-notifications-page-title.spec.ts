import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { seedMessages, clearMessages } from "./helpers/messages";
import { clearSignups } from "./helpers/signups";

test.describe("admin notifications — page title", () => {
  test.beforeEach(async ({ page }) => {
    await clearMessages();
    await clearSignups();
    await clearAdminNotificationStates();
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, signupsLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
  });

  test("prefixes the title when something is new, and clears it on mark all as read", async ({ page }) => {
    // The admin layout's own title template appends " — Admin" to every page's title.
    await page.goto("/admin");
    await expect(page).toHaveTitle("Overview — Admin");

    await seedMessages([{ status: "new" }]);
    await expect(page).toHaveTitle(/^\(1\) /, { timeout: 10_000 });

    await page.getByRole("button", { name: "Notifications" }).click();
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page).toHaveTitle("Overview — Admin");
  });

  test("prefixes the new page's own title after navigating while something is new", async ({ page }) => {
    await seedMessages([{ status: "new" }]);
    await page.goto("/admin");
    await expect(page).toHaveTitle(/^\(1\) Overview — Admin$/);

    await page.getByRole("link", { name: "News" }).click();
    await expect(page).toHaveTitle(/^\(1\) News — Admin$/);
  });
});

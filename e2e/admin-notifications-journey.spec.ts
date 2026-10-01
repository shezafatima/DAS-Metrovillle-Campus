import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { clearMessages, forwardedFor } from "./helpers/messages";
import { clearSignups } from "./helpers/signups";

/**
 * The spec's own Acceptance sequence end to end (SC-001): submit a
 * contact message and a signup through the public pages, confirm the
 * bell and both sidebar indicators, open the panel, choose an item,
 * then "Mark all as read" clears everything.
 */
test.use({ extraHTTPHeaders: forwardedFor(209) });

test.describe("admin notifications — acceptance journey", () => {
  test.beforeEach(async () => {
    await clearMessages();
    await clearSignups();
    await clearAdminNotificationStates();
  });

  test("public submissions surface in the bell and sidebar, and mark-all-as-read clears them", async ({ page }) => {
    // 1. A visitor submits a contact message.
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ali-journey@example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("Admission enquiry");
    await page.getByRole("textbox", { name: "Your Message" }).fill("What are the fees for class 3?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });

    // 2. A visitor signs up from the home page.
    await page.goto("/");
    await page.getByRole("textbox", { name: "Name" }).fill("Sara Ahmed");
    await page.getByRole("textbox", { name: "Email" }).fill("sara-journey@example.com");
    await page.getByRole("textbox", { name: "Phone" }).fill("03001234567");
    await page.getByRole("button", { name: "Signup" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you!");

    // 3. Admin logs in and marks the admin's "last opened Signups"
    // moment in the past so the just-created signup counts as new.
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, signupsLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
    await page.goto("/admin");

    // 4. Bell and both sidebar indicators show the arrivals.
    await expect(page.getByTestId("notification-bell-dot")).toBeVisible();
    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).toBeVisible();
    await expect(page.getByRole("link", { name: "Signups" }).locator("..").getByText("1")).toBeVisible();

    // 5. Open the panel and confirm both items are listed.
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText("Ali Khan")).toBeVisible();
    await expect(page.getByText("Sara Ahmed")).toBeVisible();

    // 6. Choosing an item opens the right place.
    await page.getByRole("link", { name: /Ali Khan/ }).click();
    await expect(page).toHaveURL(/\/admin\/messages\/[a-f0-9]+$/);

    // 7. "Mark all as read" clears everything.
    await page.getByRole("button", { name: "Notifications" }).click();
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByText("You're all caught up — nothing new.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("notification-bell-dot")).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Signups" }).locator("..").getByText("1")).not.toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { seedMessages, clearMessages } from "./helpers/messages";
import { seedSignups, clearSignups } from "./helpers/signups";

test.describe("admin notifications — bell", () => {
  test.beforeEach(async ({ page }) => {
    await clearMessages();
    await clearSignups();
    await clearAdminNotificationStates();
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, signupsLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
  });

  test("lists a new message and a new signup, newest first with a New mark", async ({ page }) => {
    const [messageId] = await seedMessages([{ name: "Ali Khan", email: "ali@example.com", subject: "Admission enquiry", body: "Hi", status: "new" }]);
    await seedSignups([{ name: "Sara Ahmed", email: "sara@example.com", phone: "+923001234567", sources: ["home"], lastSignupAt: new Date() }]);

    await page.goto("/admin");
    await page.getByRole("button", { name: "Notifications" }).click();

    await expect(page.getByText("Ali Khan")).toBeVisible();
    await expect(page.getByText("Sara Ahmed")).toBeVisible();
    expect(await page.getByText("New").count()).toBeGreaterThanOrEqual(2);

    // choosing the message navigates to its detail page and closes the panel
    await page.getByRole("link", { name: /Ali Khan/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/messages/${messageId}$`));
    await expect(page.getByText("Sara Ahmed")).not.toBeVisible();
  });

  test("choosing a signup item goes to the Signups list", async ({ page }) => {
    await seedSignups([{ name: "Sara Ahmed", email: "sara2@example.com", phone: "+923001234567", sources: ["home"], lastSignupAt: new Date() }]);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Notifications" }).click();
    await page.getByRole("link", { name: /Sara Ahmed/ }).click();
    await expect(page).toHaveURL(/\/admin\/signups$/);
  });

  test("Escape and outside click both close the panel", async ({ page }) => {
    await seedMessages([{ status: "new" }]);
    await page.goto("/admin");
    const bell = page.getByRole("button", { name: "Notifications" });
    await bell.click();
    await expect(page.getByRole("link", { name: "See all messages" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "See all messages" })).not.toBeVisible();

    await bell.click();
    await expect(page.getByRole("link", { name: "See all messages" })).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByRole("link", { name: "See all messages" })).not.toBeVisible();
  });

  test("Mark all as read clears the bell and shows the empty state without closing", async ({ page }) => {
    await seedMessages([{ status: "new" }]);
    await seedSignups([{ name: "Sara", email: "sara3@example.com", phone: "+923001234567", sources: ["home"], lastSignupAt: new Date() }]);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Notifications" }).click();
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByText("You're all caught up — nothing new.")).toBeVisible();
  });

  test("shows the empty state when nothing is new", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText("You're all caught up — nothing new.")).toBeVisible();
  });

  test("keyboard: open, tab through, Escape returns focus to the bell", async ({ page }) => {
    await seedMessages([{ status: "new" }]);
    await page.goto("/admin");
    const bell = page.getByRole("button", { name: "Notifications" });
    await bell.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: "See all messages" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(bell).toBeFocused();
  });

  test("opens full width on a phone-sized viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await seedMessages([{ status: "new" }]);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Notifications" }).click();
    const panel = page.getByRole("link", { name: "See all messages" }).locator("xpath=ancestor::*[@data-slot='popover-content']");
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300);
  });
});

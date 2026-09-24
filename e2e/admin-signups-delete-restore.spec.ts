import { test, expect } from "@playwright/test";
import { clearSignups, findSignupByEmail, loginAsAdmin, seedSignups } from "./helpers/signups";

test.describe("admin deletes a signup, restore by re-signup (US4)", () => {
  test.beforeEach(async () => {
    await clearSignups();
  });

  test("cancel leaves the row untouched; confirm soft-deletes it", async ({ page }) => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await seedSignups([
      {
        name: "Ali Khan",
        email: "ali@example.com",
        phone: "+923001234567",
        firstSignupAt: twoDaysAgo,
        lastSignupAt: twoDaysAgo,
      },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/signups");

    // Cancel: nothing changes.
    await page.getByRole("button", { name: /Delete: Ali Khan/ }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("table tbody tr", { hasText: "Ali Khan" })).toHaveCount(1);

    // Confirm: the row disappears and a confirmation toast appears.
    await page.getByRole("button", { name: /Delete: Ali Khan/ }).click();
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/admin/signups/")),
      page.getByRole("button", { name: "Delete", exact: true }).click(),
    ]);
    await expect(page.locator("table tbody tr", { hasText: "Ali Khan" })).toHaveCount(0);
    await expect(page.getByText("Signup deleted")).toBeVisible();

    const deleted = await findSignupByEmail("ali@example.com", { withDeleted: true });
    expect(deleted!.deletedAt).not.toBeNull();
  });

  test("signing up again with the deleted email restores the same record", async ({ page }) => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await seedSignups([
      {
        name: "Ali Khan",
        email: "ali@example.com",
        phone: "+923001234567",
        firstSignupAt: twoDaysAgo,
        lastSignupAt: twoDaysAgo,
      },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/signups");
    await page.getByRole("button", { name: /Delete: Ali Khan/ }).click();
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/admin/signups/")),
      page.getByRole("button", { name: "Delete", exact: true }).click(),
    ]);
    await expect(page.locator("table tbody tr", { hasText: "Ali Khan" })).toHaveCount(0);

    // Sign up again with the same email — the same visit context.
    await page.goto("/");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Restored");
    await page.getByRole("textbox", { name: "Email" }).fill("ali@example.com");
    await page.getByRole("textbox", { name: "Phone" }).fill("03001234567");
    await page.getByRole("button", { name: "Signup" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you!");

    await page.goto("/admin/signups");
    const rows = page.locator("table tbody tr", { hasText: "ali@example.com" });
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("Ali Restored");

    const restored = await findSignupByEmail("ali@example.com");
    expect(restored).not.toBeNull();
    expect(restored!.deletedAt).toBeNull();
    expect(restored!.firstSignupAt.getTime()).toBe(twoDaysAgo.getTime());
  });

  test("deleting the same row from a second tab shows 'no longer available' in the first", async ({ page, context }) => {
    await seedSignups([{ name: "Ali Khan", email: "ali@example.com", phone: "+923001234567" }]);
    await loginAsAdmin(page);
    await page.goto("/admin/signups");

    // Open the confirmation dialog in the first tab, but don't confirm yet.
    await page.getByRole("button", { name: /Delete: Ali Khan/ }).click();

    // Delete the same row from a second tab in the same session.
    const secondPage = await context.newPage();
    await secondPage.goto("/admin/signups");
    await secondPage.getByRole("button", { name: /Delete: Ali Khan/ }).click();
    await secondPage.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(secondPage.getByText("Signup deleted")).toBeVisible();
    await secondPage.close();

    // Now confirm the first tab's already-open dialog — the record is gone.
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("This signup is no longer available")).toBeVisible();
    await page.reload();
    await expect(page.locator("table tbody tr", { hasText: "Ali Khan" })).toHaveCount(0);
  });
});

import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { seedMessages, clearMessages, findMessages } from "./helpers/messages";
import { seedCareerApplications, clearCareerApplications } from "./helpers/careers";

/**
 * US4 — Updating without reloading. Relies on
 * NEXT_PUBLIC_NOTIFICATIONS_POLL_MS (set for the whole "admin" project
 * in playwright.config.ts's webServer.env — see plan.md's testability
 * seam) so the ~60s production interval doesn't make this spec slow.
 */
test.describe("admin notifications — live updates", () => {
  test.beforeEach(async ({ page }) => {
    await clearMessages();
    await clearCareerApplications();
    await clearAdminNotificationStates();
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, careersLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
  });

  test("a message seeded elsewhere appears within the poll interval, without a reload", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).not.toBeVisible();

    await seedMessages([{ status: "new" }]);

    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).toBeVisible({ timeout: 10_000 });
  });

  test("reading a message updates the sidebar immediately, not waiting for the timer", async ({ page }) => {
    const [id] = await seedMessages([{ status: "new" }]);
    // MarkReadOnOpen fires this once per mount; wait for it explicitly
    // rather than for general sidebar visibility, which can pass
    // vacuously if the badge was never rendered in the first place.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/admin/messages/${id}/read`) && r.status() === 200),
      page.goto(`/admin/messages/${id}`),
    ]);

    const rows = await findMessages({});
    expect(rows[0]!.status).toBe("read");
    await expect(page.getByRole("link", { name: "Messages" }).locator("..").getByText("1")).not.toBeVisible();
  });

  test("deleting a new application updates the Applications indicator immediately", async ({ page }) => {
    // The detail page does not mark the list as opened, so the badge is still 1 here.
    const [{ id }] = await seedCareerApplications([{ name: "Sara", email: "sara-live@example.com", phone: "+923001234567", createdAt: new Date() }]);
    await page.goto(`/admin/careers/${id}`);
    // exact: the detail page also has a "Back to applications" link.
    const sidebarItem = page.getByRole("link", { name: "Applications", exact: true }).locator("..");
    await expect(sidebarItem.getByText("1")).toBeVisible();

    await page.getByRole("button", { name: "Delete application" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page).toHaveURL(/\/admin\/careers$/, { timeout: 15000 });
    await expect(page.getByRole("link", { name: "Applications" }).locator("..").getByText("1")).not.toBeVisible({ timeout: 3000 });
  });
});

import { test, expect } from "@playwright/test";
import { clearMessages, loginAsAdmin, seedMessages } from "./helpers/messages";

async function confirmDetailDelete(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/admin/messages/")),
    page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click(),
  ]);
}

function sidebarMessagesItem(page: import("@playwright/test").Page) {
  return page.locator("li", { has: page.getByRole("link", { name: "Messages" }) });
}

test.describe("admin messages — new message indicator (US7)", () => {
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("sidebar badge and overview card reflect open/status/delete without a full reload", async ({ page }) => {
    test.slow();
    const ids = await seedMessages([
      { name: "New 1", status: "new" },
      { name: "New 2", status: "new" },
      { name: "New 3", status: "new" },
      { name: "Read 1", status: "read" },
      { name: "Responded 1", status: "responded" },
    ]);
    await loginAsAdmin(page);

    await page.goto("/admin");
    const messagesCard = page.locator("[data-slot='card']").filter({ hasText: "Messages" });
    await expect(messagesCard).toContainText("5");
    await expect(messagesCard).toContainText("3 new");
    const sidebarLink = sidebarMessagesItem(page);
    await expect(sidebarLink).toContainText("3");

    // Open one new message -> badge drops to 2, no full reload.
    await page.goto(`/admin/messages/${ids[0]}`);
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("read", { timeout: 10000 });
    await expect(sidebarMessagesItem(page)).toContainText("2");

    // Set it back to New -> badge returns to 3.
    await page.getByRole("combobox", { name: "Status" }).selectOption("new");
    await expect(page.getByText("Status updated to New")).toBeVisible();
    await expect(sidebarMessagesItem(page)).toContainText("3");

    // Delete a new message -> badge drops to 2.
    await page.goto(`/admin/messages/${ids[1]}`);
    await confirmDetailDelete(page);
    await expect(sidebarMessagesItem(page)).toContainText("2");

    // Mark every remaining new message read -> badge disappears entirely.
    await page.goto(`/admin/messages/${ids[0]}`);
    await page.getByRole("combobox", { name: "Status" }).selectOption("read");
    await expect(page.getByText("Status updated to Read")).toBeVisible();
    await page.goto(`/admin/messages/${ids[2]}`);
    // Auto-read on open.
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("read", { timeout: 10000 });
    await page.goto("/admin/messages");
    await expect(sidebarMessagesItem(page).getByText(/^\d+$/)).toHaveCount(0);
  });
});

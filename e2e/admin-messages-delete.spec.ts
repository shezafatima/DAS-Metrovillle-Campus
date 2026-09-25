import { test, expect } from "@playwright/test";
import { clearMessages, findMessages, loginAsAdmin, seedMessages } from "./helpers/messages";

async function confirmRowDelete(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /Delete message/ }).click();
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/admin/messages/")),
    page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click(),
  ]);
}

async function confirmDetailDelete(page: import("@playwright/test").Page) {
  // On the detail page the trigger itself is a plain "Delete" button
  // (triggerLabel); clicking it only opens the confirm dialog, which
  // holds a second, separate "Delete" button (the actual confirm action).
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/admin/messages/")),
    page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click(),
  ]);
}

test.describe("admin messages — delete (US4)", () => {
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("cancel leaves the row in place", async ({ page }) => {
    await seedMessages([{ name: "Ali Khan" }]);
    await loginAsAdmin(page);
    await page.goto("/admin/messages");

    await page.getByRole("button", { name: /Delete message/ }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(1);
  });

  test("confirming shows the toast, removes the row, and sets deletedAt", async ({ page }) => {
    await seedMessages([{ name: "Ali Khan", email: "delete-me@example.com" }]);
    await loginAsAdmin(page);
    await page.goto("/admin/messages");

    await confirmRowDelete(page);

    await expect(page.getByText("Message deleted")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("No messages yet.")).toBeVisible();

    const docs = await findMessages({ email: "delete-me@example.com", withDeleted: true });
    expect(docs[0]!.deletedAt).not.toBeNull();
  });

  test("a deleted message is excluded from search and every status filter", async ({ page }) => {
    await seedMessages([{ name: "Findable Ali", status: "new" }]);
    await loginAsAdmin(page);
    await page.goto("/admin/messages");
    await confirmRowDelete(page);
    await expect(page.getByText("No messages yet.")).toBeVisible();

    await page.getByLabel("Search name, email or subject").fill("Findable");
    await expect(page.getByText("No messages match your search or filter.")).toBeVisible();

    await page.getByLabel("Search name, email or subject").fill("");
    for (const status of ["new", "read", "responded"]) {
      await page.getByLabel("Status").selectOption(status);
      await expect(page.getByText(/No messages/)).toBeVisible();
    }
  });

  test("deleting from the detail page returns to the same filtered inbox page", async ({ page }) => {
    const seeds = Array.from({ length: 25 }, (_, i) => ({
      name: `Person ${i}`,
      status: "new" as const,
      createdAt: new Date(Date.UTC(2026, 0, i + 1)),
    }));
    await seedMessages(seeds);
    await loginAsAdmin(page);
    await page.goto("/admin/messages?status=new&page=2");
    await expect(page.locator("table tbody tr")).toHaveCount(5);

    await page.locator("table tbody tr").first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/admin\/messages\/[a-f0-9]+\?from=status%3Dnew%26page%3D2/);
    const targetId = page.url().match(/\/admin\/messages\/([a-f0-9]+)\?/)![1];

    await confirmDetailDelete(page);
    await expect(page).toHaveURL(/\/admin\/messages\?status=new&page=2/);
    await expect(page.locator(`a[href*="${targetId}"]`)).toHaveCount(0);
  });

  test("opening the deleted message's old URL shows 'no longer available'", async ({ page }) => {
    const [id] = await seedMessages([{ name: "Ali Khan" }]);
    await loginAsAdmin(page);
    await page.goto(`/admin/messages/${id}`);
    await confirmDetailDelete(page);

    await page.goto(`/admin/messages/${id}`);
    await expect(page.getByText("This message is no longer available.")).toBeVisible();
  });

  test("a session-less delete request is rejected", async ({ page }) => {
    const [id] = await seedMessages([{ name: "Ali Khan" }]);
    const response = await page.request.delete(`/api/admin/messages/${id}`);
    expect(response.status()).toBe(401);
  });
});

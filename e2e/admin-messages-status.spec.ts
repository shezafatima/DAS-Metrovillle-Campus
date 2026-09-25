import { test, expect } from "@playwright/test";
import { clearMessages, findMessages, loginAsAdmin, seedMessages } from "./helpers/messages";

test.describe("admin messages — status tracking (US3)", () => {
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("opening a new message marks it read without a manual reload", async ({ page }) => {
    const [id] = await seedMessages([{ name: "Ali Khan", email: "ali@example.com", status: "new" }]);
    await loginAsAdmin(page);
    await page.goto(`/admin/messages/${id}`);

    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("read");

    await page.goto("/admin/messages");
    const row = page.locator("table tbody tr").first();
    await expect(row.getByRole("link").first()).not.toHaveClass(/font-bold/);
    await expect(row.getByText("Read")).toBeVisible();

    const docs = await findMessages({ email: "ali@example.com" });
    expect(docs[0]!.status).toBe("read");
  });

  test("a responded message stays Responded on open", async ({ page }) => {
    const [id] = await seedMessages([{ name: "Ali Khan", status: "responded" }]);
    await loginAsAdmin(page);
    await page.goto(`/admin/messages/${id}`);
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("responded");
  });

  test("clicking Mark as responded shows the confirmation toast and saves the status", async ({ page }) => {
    const [id] = await seedMessages([{ name: "Ali Khan", email: "responded-click@example.com", status: "new" }]);
    await loginAsAdmin(page);
    await page.goto(`/admin/messages/${id}`);

    await page.getByRole("button", { name: "Mark as responded" }).click();
    await expect(page.getByText("Status updated to Responded")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("responded");

    const docs = await findMessages({ email: "responded-click@example.com" });
    expect(docs[0]!.status).toBe("responded");
  });

  test("setting the status to New shows it as New in the inbox", async ({ page }) => {
    const [id] = await seedMessages([{ name: "Ali Khan", email: "back-to-new@example.com", status: "read" }]);
    await loginAsAdmin(page);
    await page.goto(`/admin/messages/${id}`);

    await page.getByRole("combobox", { name: "Status" }).selectOption("new");
    await expect(page.getByText("Status updated to New")).toBeVisible();

    await page.goto("/admin/messages");
    const row = page.locator("table tbody tr").first();
    await expect(row.getByRole("link").first()).toHaveClass(/font-bold/);
    await expect(row.getByText("New", { exact: true })).toBeVisible();

    const docs = await findMessages({ email: "back-to-new@example.com" });
    expect(docs[0]!.status).toBe("new");
  });

  test("a failed PATCH shows an error toast and keeps the previous status selected", async ({ page }) => {
    const [id] = await seedMessages([{ name: "Ali Khan", status: "new" }]);
    await loginAsAdmin(page);
    await page.goto(`/admin/messages/${id}`);
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("read");

    await page.route(`**/api/admin/messages/${id}`, (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({ status: 503, body: '{"error":"unavailable"}' })
        : route.continue(),
    );

    await page.getByRole("combobox", { name: "Status" }).selectOption("responded");
    await expect(page.getByText("Couldn't update the status. Please try again.")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("read");
  });
});

import { test, expect } from "@playwright/test";
import { clearMessages, findMessages, loginAsAdmin } from "./helpers/messages";
import { forwardedFor } from "./helpers/messages";

test.use({ extraHTTPHeaders: forwardedFor(70) });

test.describe("contact-messages — full acceptance journey", () => {
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("send, read, respond, filter, search, delete", async ({ page }) => {
    test.setTimeout(150000);
    // 1. Send a message through /contact.
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("Ali@Example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("Admission for class 3");
    await page.getByRole("textbox", { name: "Your Message" }).fill("What are the fees for class 3?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });

    // 2. Send a second, different message from the same email, capitalised differently.
    await page.getByRole("button", { name: "Send another message" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ALI@example.COM");
    await page.getByRole("textbox", { name: "Subject" }).fill("Uniform sizes");
    await page.getByRole("textbox", { name: "Your Message" }).fill("What sizes are available?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });

    // 3. Log in — both appear as New, sidebar shows 2.
    await loginAsAdmin(page);
    await page.goto("/admin/messages");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table tbody tr")).toHaveCount(2);
    const sidebarMessages = page.locator("li", { has: page.getByRole("link", { name: "Messages" }) });
    await expect(sidebarMessages).toContainText("2");

    // 4. Open the first (newest — Uniform sizes). It becomes Read, sidebar shows 1.
    const uniformLink = page.getByRole("link", { name: "Uniform sizes" });
    await uniformLink.waitFor({ state: "visible" });
    await uniformLink.click();
    await expect(page).toHaveURL(/\/admin\/messages\/[a-f0-9]+/, { timeout: 15000 });
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("read", { timeout: 20000 });
    await expect(sidebarMessages).toContainText("1");

    // 5. Mark it responded.
    await page.getByRole("button", { name: "Mark as responded" }).click();
    await expect(page.getByText("Status updated to Responded")).toBeVisible();

    // 6. Filter to Responded shows only it; search by its subject shows only it.
    await page.goto("/admin/messages");
    await page.getByLabel("Status").selectOption("responded");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("Uniform sizes");

    await page.getByLabel("Status").selectOption("all");
    await expect(page).not.toHaveURL(/status=responded/);
    await page.getByLabel("Search name, email or subject").fill("Uniform");
    await expect(page).toHaveURL(/[?&]q=Uniform/, { timeout: 5000 });
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // 7. Delete it from the detail page — gone from inbox; overview total drops by 1.
    await page.getByRole("link", { name: "Uniform sizes" }).click();
    await expect(page).toHaveURL(/\/admin\/messages\/[a-f0-9]+/);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/admin/messages/")),
      page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click(),
    ]);
    await expect(page.getByText("Message deleted")).toBeVisible({ timeout: 10000 });

    await page.goto("/admin");
    const messagesCard = page.locator("[data-slot='card']").filter({ hasText: "Messages" });
    await expect(messagesCard).toContainText("1");

    // 8. Both documents exist, one soft-deleted.
    const docs = await findMessages({ email: "ali@example.com", withDeleted: true });
    expect(docs).toHaveLength(2);
    expect(docs.some((d) => d.deletedAt !== null)).toBe(true);
  });
});

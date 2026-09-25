import { test, expect } from "@playwright/test";
import { seedMessages, clearMessages } from "./helpers/messages";

test.describe("admin messages — unauthorized access", () => {
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("GET /admin/messages redirects to login with next", async ({ page }) => {
    await page.goto("/admin/messages");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fmessages/);
  });

  test("GET /admin/messages/[id] redirects to login with the encoded next", async ({ page }) => {
    const [id] = await seedMessages([{ name: "Ali Khan" }]);
    await page.goto(`/admin/messages/${id}`);
    await expect(page).toHaveURL(new RegExp(`/admin/login\\?next=%2Fadmin%2Fmessages%2F${id}`));
  });

  test("every admin message API route returns 401 without a session", async ({ page }) => {
    const [id] = await seedMessages([{ name: "Ali Khan" }]);

    const readResponse = await page.request.post(`/api/admin/messages/${id}/read`);
    expect(readResponse.status()).toBe(401);

    const patchResponse = await page.request.patch(`/api/admin/messages/${id}`, { data: { status: "read" } });
    expect(patchResponse.status()).toBe(401);

    const deleteResponse = await page.request.delete(`/api/admin/messages/${id}`);
    expect(deleteResponse.status()).toBe(401);
  });
});

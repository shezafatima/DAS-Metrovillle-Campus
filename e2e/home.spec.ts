import { test, expect } from "@playwright/test";

test("home page loads inside the shell", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});

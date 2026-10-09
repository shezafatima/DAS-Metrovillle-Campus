import { test, expect } from "@playwright/test";

// 001 smoke check, updated for 006: the placeholder "Home" heading is gone; the real home
// page renders inside the shell with a single h1 (the detailed cases are in admin-home-page.spec.ts).
test("home page loads inside the shell", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toBeVisible();
});

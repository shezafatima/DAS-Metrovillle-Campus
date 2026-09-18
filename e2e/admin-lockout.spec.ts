import { test, expect } from "@playwright/test";
import { E2E_ADMIN, clearThrottle } from "./global-setup";

// Serial: every case in this spec shares the one MongoDB throttle
// collection keyed by source IP, so cases must not interleave.
test.describe.configure({ mode: "serial" });

test.describe("login abuse protection (US5)", () => {
  test.beforeAll(async () => {
    await clearThrottle();
  });

  test("after 5 failed attempts, even the correct password is refused as blocked", async ({ page }) => {
    await page.goto("/admin/login");

    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Email").fill(E2E_ADMIN.email);
      await page.getByLabel("Password").fill("definitely-wrong-password");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("alert")).toBeVisible();
    }

    // 6th attempt, this time with the CORRECT password — still blocked.
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password").fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toHaveText("Too many attempts. Please try again later.");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("the HTTP sign-in route is refused with 429 while the block is active", async ({ request }) => {
    const response = await request.post("/api/auth/sign-in/email", {
      data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
    });
    expect(response.status()).toBe(429);
  });
});

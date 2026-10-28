import { test, expect, type Page } from "@playwright/test";
import { E2E_ADMIN, clearThrottle } from "./global-setup";

// Serial: every case in this spec shares the one MongoDB throttle
// collection keyed by source IP, so cases must not interleave.
test.describe.configure({ mode: "serial" });

/**
 * Submits the sign-in form and waits for the server's answer. Without that wait, the alert from the previous attempt is still on
 * screen and satisfies the next check at once; the next click then lands while the form is still submitting and is ignored, so
 * fewer than five failures are ever recorded and the account is never locked.
 */
async function submitSignIn(page: Page) {
  const answered = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/admin/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await answered;
}

test.describe("login abuse protection (US5)", () => {
  test.beforeAll(async () => {
    await clearThrottle();
  });

  // This spec locks the e2e admin on purpose (and, now that its five failures are really recorded, the lock holds for 15 minutes).
  // Leave the throttle empty so the specs that sign in after it are not refused.
  test.afterAll(async () => {
    await clearThrottle();
  });

  test("after 5 failed attempts, even the correct password is refused as blocked", async ({ page }) => {
    test.setTimeout(240_000); // six sign-ins, each waited for, on a slow `next dev`
    await page.goto("/admin/login");

    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Email").fill(E2E_ADMIN.email);
      await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-password");
      await submitSignIn(page);
      await expect(page.locator('p[role="alert"]')).toBeVisible();
    }

    // 6th attempt, this time with the CORRECT password — still blocked.
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
    await submitSignIn(page);

    await expect(page.locator('p[role="alert"]')).toHaveText("Too many attempts. Please try again later.", { timeout: 30_000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("the HTTP sign-in route is refused with 429 while the block is active", async ({ request }) => {
    const response = await request.post("/api/auth/sign-in/email", {
      data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
    });
    expect(response.status()).toBe(429);
  });
});

import { test, expect } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

test.describe("protected admin area (US3)", () => {
  test("logged out, every admin page except login redirects to /admin/login", async ({ page }) => {
    for (const path of ["/admin", "/admin/news", "/admin/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/admin/login\\?next=${encodeURIComponent(path)}`));
    }
  });

  test("logging in from a redirect returns to the originally requested page", async ({ page }) => {
    await page.goto("/admin/news");
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/admin/news");
  });

  test("an unsafe next destination is ignored in favour of /admin", async ({ page }) => {
    await page.goto("/admin/login?next=https://evil.com");
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/admin");
  });

  test("the admin API rejects a request with no session", async ({ request }) => {
    const response = await request.get("/api/admin/session");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "unauthorized" });
  });

  test("a garbage session cookie is treated as no session, both for the page and the API", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "not-a-real-session-token",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);

    const response = await page.request.get("/api/admin/session");
    expect(response.status()).toBe(401);
  });

  test("a valid session is served normally at the page and API level", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/admin");

    const response = await page.request.get("/api/admin/session");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.email).toBe(E2E_ADMIN.email);
  });
});

import { test, expect } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import { openProfileMenu } from "./helpers/account";

test.describe("admin login and logout (US2)", () => {
  test("correct credentials land on /admin and the session survives a reload", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/admin");
    // The email now lives in the profile menu (010); the signed-in top bar shows its trigger.
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL("/admin");
    // The email now lives in the profile menu (010); the signed-in top bar shows its trigger.
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  });

  test("visiting /admin/login while logged in redirects to /admin", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/admin");

    await page.goto("/admin/login");
    await expect(page).toHaveURL("/admin");
  });

  test("logout ends the session and returns to /admin/login", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/admin");

    // Logout moved from the sidebar footer into the profile menu (010 FR-004).
    const menu = await openProfileMenu(page);
    await expect(menu).toContainText(E2E_ADMIN.email);
    await menu.getByRole("menuitem", { name: "Logout" }).click();
    await expect(page).toHaveURL("/admin/login");

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("wrong password, wrong email, and an unknown account show the identical generic message", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    const wrongPasswordText = await page.getByRole("alert").textContent();

    await page.getByLabel("Email").fill("");
    await page.getByLabel("Email").fill("no-such-admin@example.com");
    await page.getByLabel("Password", { exact: true }).fill("also-does-not-matter-12345");
    await page.getByRole("button", { name: "Sign in" }).click();
    const unknownEmailText = await page.getByRole("alert").textContent();

    expect(wrongPasswordText).toBe(unknownEmailText);
    expect(wrongPasswordText).toBe("The email or password is incorrect.");
  });

  test("email is matched case-insensitively", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(E2E_ADMIN.email.toUpperCase());
    await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/admin");
  });
});

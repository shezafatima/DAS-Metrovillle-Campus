import { test, expect, type Page } from "@playwright/test";
import { E2E_ADMIN, clearThrottle } from "./global-setup";
import { loginAs, logoutViaProfileMenu, restoreAdminPassword } from "./helpers/account";
import { accountCopy, loginCopy } from "../src/content/admin";

const NEW_PASSWORD = "e2e-new-password-2026!";
const WRONG_CURRENT = "e2e-wrong-current-password";

/** Every response body the page receives for a POST (Server Actions), for the no-leak check (FR-015). */
function recordPostResponses(page: Page, into: string[]) {
  page.on("response", async (response) => {
    if (response.request().method() !== "POST") return;
    try {
      into.push(await response.text());
    } catch {
      // Redirect or aborted responses carry no readable body.
    }
  });
}

async function fillPasswords(page: Page, current: string, next: string, confirm: string) {
  await page.getByLabel(accountCopy.changePassword.currentLabel, { exact: true }).fill(current);
  await page.getByLabel(accountCopy.changePassword.newLabel, { exact: true }).fill(next);
  await page.getByLabel(accountCopy.changePassword.confirmLabel, { exact: true }).fill(confirm);
  await page.getByRole("button", { name: accountCopy.changePassword.submit }).click();
}

test.describe("admin account — change password (010 US1)", () => {
  test.beforeEach(async () => {
    await clearThrottle();
  });

  test.afterEach(() => {
    restoreAdminPassword();
  });

  test("change the password from the panel: rejections, success, other device signed out, old password dead", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const bodies: string[] = [];
    recordPostResponses(page, bodies);

    const deviceB = await browser.newContext();
    const pageB = await deviceB.newPage();

    await test.step("log in on two devices", async () => {
      await loginAs(page);
      await loginAs(pageB);
    });

    await test.step("reach the Account page from the profile menu by keyboard", async () => {
      const trigger = page.getByRole("button", { name: "Account menu" });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const account = page.getByRole("menu").getByRole("menuitem", { name: "Account" });
      if (!(await account.evaluate((el) => el === document.activeElement))) {
        await page.keyboard.press("ArrowDown");
      }
      await expect(account).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL("/admin/account");
      await expect(page.getByRole("heading", { name: accountCopy.pageTitle, level: 1 })).toBeVisible();
    });

    await test.step("a wrong current password is rejected and changes nothing", async () => {
      await fillPasswords(page, WRONG_CURRENT, NEW_PASSWORD, NEW_PASSWORD);
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(accountCopy.errors.wrong_current);
    });

    await test.step("mismatched new passwords are rejected", async () => {
      await fillPasswords(page, E2E_ADMIN.password, NEW_PASSWORD, `${NEW_PASSWORD}x`);
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(accountCopy.errors.mismatch);
    });

    await test.step("a short password is rejected", async () => {
      await fillPasswords(page, E2E_ADMIN.password, "short-pw-11", "short-pw-11");
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(accountCopy.errors.too_short);
    });

    await test.step("the same password as the current one is rejected", async () => {
      await fillPasswords(page, E2E_ADMIN.password, E2E_ADMIN.password, E2E_ADMIN.password);
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(accountCopy.errors.same_as_current);
    });

    await test.step("a valid change succeeds and this device stays signed in", async () => {
      await fillPasswords(page, E2E_ADMIN.password, NEW_PASSWORD, NEW_PASSWORD);
      await expect(page.getByRole("status").filter({ hasText: accountCopy.success })).toBeVisible();
      await expect(page.getByText(accountCopy.lastChangedLabel)).toBeVisible();
      // Without reloading: the in-response re-render kept the session (research §13).
      await expect(page).toHaveURL("/admin/account");
      await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL("/admin/account");
    });

    await test.step("the other device is signed out", async () => {
      await pageB.goto("/admin");
      await expect(pageB).toHaveURL(/\/admin\/login/);
    });

    await test.step("log out; the old password fails and the new one works", async () => {
      await logoutViaProfileMenu(page);
      await page.getByLabel("Email").fill(E2E_ADMIN.email);
      await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("alert").filter({ hasText: loginCopy.errors.generic })).toBeVisible();
      await loginAs(page, NEW_PASSWORD);
    });

    await test.step("no response ever carried a password", async () => {
      expect(bodies.length).toBeGreaterThan(0);
      for (const body of bodies) {
        expect(body).not.toContain(E2E_ADMIN.password);
        expect(body).not.toContain(NEW_PASSWORD);
        expect(body).not.toContain(WRONG_CURRENT);
      }
    });

    await deviceB.close();
  });
});

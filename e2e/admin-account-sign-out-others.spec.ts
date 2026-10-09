import { test, expect } from "@playwright/test";
import { clearThrottle } from "./global-setup";
import { loginAs, logoutViaProfileMenu, restoreAdminPassword } from "./helpers/account";
import { accountCopy } from "../src/content/admin";

const copy = accountCopy.signOutOthers;

test.describe("admin account — sign out other devices (010 US2)", () => {
  test.beforeEach(async () => {
    await clearThrottle();
  });

  test.afterEach(() => {
    // Nothing changes the password here; restore anyway so a failure
    // mid-way can never leave later admin specs unable to log in.
    restoreAdminPassword();
  });

  test("see when the password was last changed and sign out every other device without changing it", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    const deviceB = await browser.newContext();
    const pageB = await deviceB.newPage();

    await test.step("log in on two devices", async () => {
      await loginAs(page);
      await loginAs(pageB);
    });

    await test.step("the Account page shows when the password was last changed", async () => {
      await page.goto("/admin/account");
      await expect(page.getByTestId("password-last-changed")).toHaveText(/\d{2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}/);
    });

    await test.step("cancelling the confirmation signs nothing out", async () => {
      await page.getByRole("button", { name: copy.button }).click();
      await expect(page.getByRole("alertdialog")).toContainText(copy.dialogBody);
      await page.getByRole("button", { name: copy.cancel }).click();
      await pageB.goto("/admin");
      await expect(pageB).toHaveURL("/admin");
    });

    await test.step("confirming signs out the other device and keeps this one", async () => {
      await page.getByRole("button", { name: copy.button }).click();
      await page.getByRole("button", { name: copy.confirm }).click();
      await expect(page.getByRole("status").filter({ hasText: copy.success })).toBeVisible();

      await pageB.goto("/admin");
      await expect(pageB).toHaveURL(/\/admin\/login/);

      await page.reload();
      await expect(page).toHaveURL("/admin/account");
    });

    await test.step("the password is unchanged", async () => {
      await logoutViaProfileMenu(page);
      await loginAs(page);
    });

    await deviceB.close();
  });
});

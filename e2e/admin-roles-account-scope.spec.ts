import { test, expect } from "@playwright/test";
import { adminSession, loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";
import { accountCopy } from "../src/content/admin";

test.describe("roles — the account actions across roles (011 US6; Constitution III: the main admin controls every password)", () => {
  test.beforeEach(async () => {
    await resetUsers();
  });

  test("a content manager has no way to change a password; their own sign-out and the main admin's stay separate", async ({ browser }) => {
    test.setTimeout(420_000);
    const user = await seedActiveUser({ email: "account-scope@example.test" });
    const cm = await loginSeeded(browser, user);
    const cmOtherDevice = await loginSeeded(browser, user);
    const admin = await adminSession(browser);
    const adminOtherDevice = await adminSession(browser);

    await test.step("the Account page opens for them, with no change-password form, only a note", async () => {
      await cm.page.goto("/admin/account");
      await expect(cm.page.getByRole("heading", { name: accountCopy.pageTitle, level: 1 })).toBeVisible();
      await expect(cm.page.getByText(user.email)).toBeVisible();
      await expect(cm.page.getByTestId("password-managed-by-admin")).toHaveText(accountCopy.passwordManagedByAdmin.body);
      await expect(cm.page.locator('input[data-slot="password-input"]')).toHaveCount(0);
      await expect(cm.page.getByRole("button", { name: accountCopy.changePassword.submit })).toHaveCount(0);
    });

    await test.step("the main admin's Account page still has the form", async () => {
      await admin.page.goto("/admin/account");
      await expect(admin.page.locator('input[data-slot="password-input"]')).toHaveCount(3);
      await expect(admin.page.getByTestId("password-managed-by-admin")).toHaveCount(0);
    });

    await test.step("they can sign out THEIR OTHER devices only", async () => {
      await cm.page.getByRole("button", { name: accountCopy.signOutOthers.button }).click();
      await cm.page.getByRole("alertdialog").getByRole("button", { name: accountCopy.signOutOthers.confirm }).click();
      await expect(cm.page.getByText(accountCopy.signOutOthers.success)).toBeVisible({ timeout: 30_000 });

      await cmOtherDevice.page.goto("/admin");
      await expect(cmOtherDevice.page).toHaveURL(/\/admin\/login/);
      await cm.page.goto("/admin");
      await expect(cm.page).toHaveURL("/admin");
      // Every main admin session is still signed in.
      await admin.page.goto("/admin");
      await expect(admin.page).toHaveURL("/admin");
      await adminOtherDevice.page.goto("/admin");
      await expect(adminOtherDevice.page).toHaveURL("/admin");
    });

    await test.step("and the reverse: the main admin signing out their other devices leaves the content manager signed in", async () => {
      await admin.page.goto("/admin/account");
      await admin.page.getByRole("button", { name: accountCopy.signOutOthers.button }).click();
      await admin.page.getByRole("alertdialog").getByRole("button", { name: accountCopy.signOutOthers.confirm }).click();
      await expect(admin.page.getByText(accountCopy.signOutOthers.success)).toBeVisible({ timeout: 30_000 });

      await adminOtherDevice.page.goto("/admin");
      await expect(adminOtherDevice.page).toHaveURL(/\/admin\/login/);
      await cm.page.goto("/admin");
      await expect(cm.page).toHaveURL("/admin");
    });
  });

  test("the raw auth-library mutation routes stay closed for every role, and the admin plugin is not mounted", async ({ browser }) => {
    test.setTimeout(300_000);
    const closed: Array<[string, unknown]> = [
      ["/api/auth/change-password", { currentPassword: "x", newPassword: "y".repeat(14), revokeOtherSessions: true }],
      ["/api/auth/revoke-other-sessions", {}],
      ["/api/auth/revoke-sessions", {}],
      ["/api/auth/revoke-session", { token: "x" }],
      ["/api/auth/update-user", { name: "Someone Else" }],
      ["/api/auth/change-email", { newEmail: "someone-else@example.test" }],
      ["/api/auth/set-password", { newPassword: "y".repeat(14) }],
      // The Better Auth admin plugin (its /admin/* routes) is deliberately not installed.
      ["/api/auth/admin/set-role", { userId: "u", role: "main_admin" }],
      ["/api/auth/admin/set-user-password", { userId: "u", newPassword: "y".repeat(14) }],
      ["/api/auth/admin/ban-user", { userId: "u" }],
      ["/api/auth/admin/create-user", { email: "x@example.test", password: "y".repeat(14), name: "x", role: "admin" }],
    ];

    const noSession = await browser.newContext();
    const cm = await loginSeeded(browser, await seedActiveUser({ email: "closed-routes@example.test" }));
    const admin = await adminSession(browser);

    for (const [who, request] of [
      ["no session", noSession.request],
      ["a content manager", cm.context.request],
      ["the main admin", admin.context.request],
    ] as const) {
      for (const [route, data] of closed) {
        const response = await request.post(route, { data });
        expect(response.status(), `${route} as ${who}`).toBe(404);
      }
    }
  });
});

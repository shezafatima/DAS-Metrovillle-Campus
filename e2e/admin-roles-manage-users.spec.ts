import { test, expect } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import {
  adminSession,
  createUserViaUi,
  editUserPanel,
  loginSeeded,
  resetPasswordViaPanel,
  resetUsers,
  seedActiveUser,
  sidebarLabels,
  submitLogin,
} from "./helpers/users";
import { loginCopy, usersCopy, userStatusLabels } from "../src/content/admin";

const confirmButton = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("alertdialog").getByRole("button", { name, exact: true });

test.describe("roles — managing users (011 US4)", () => {
  test.beforeEach(async () => {
    await resetUsers();
  });

  test("edit access, disable, enable, reset from the panel, and delete", async ({ browser }) => {
    test.setTimeout(480_000);
    const { page: adminPage } = await adminSession(browser);
    const user = await seedActiveUser({ email: "managed@example.test", permissions: ["news"] });
    const cm = await loginSeeded(browser, user);
    await cm.page.goto("/admin/news");
    await expect(cm.page).toHaveURL("/admin/news");

    const row = () => adminPage.getByTestId("user-row").filter({ hasText: user.email });
    await adminPage.goto("/admin/users");

    await test.step("edit: change sections in the panel; the user's next request sees it", async () => {
      await adminPage.getByRole("button", { name: `${usersCopy.actions.editAccess}: ${user.email}` }).click();
      const panel = editUserPanel(adminPage);
      await expect(panel).toBeVisible();
      // Editing shows the email read-only, the current sections ticked, and an empty optional password.
      await expect(panel).toContainText(user.email);
      await expect(panel.getByRole("checkbox", { name: "News" })).toBeChecked();
      await expect(panel.locator("#user-password")).toHaveValue("");
      await panel.getByRole("checkbox", { name: "News" }).uncheck();
      await panel.getByRole("checkbox", { name: "Settings" }).check();
      await panel.getByRole("button", { name: usersCopy.panel.save }).click();
      await expect(panel).toBeHidden({ timeout: 30_000 });
      await expect(row()).toContainText("Settings");
      await expect(row()).not.toContainText("News");

      await cm.page.goto("/admin/settings");
      await expect(cm.page).toHaveURL("/admin/settings");
      expect(await sidebarLabels(cm.page)).toEqual(["Overview", "Settings"]);
    });

    await test.step("disable: their open session loses access on the next request, and they cannot log in", async () => {
      await adminPage.getByRole("button", { name: `${usersCopy.actions.disable}: ${user.email}` }).click();
      await confirmButton(adminPage, usersCopy.confirm.disableConfirm).click();
      await expect(row()).toContainText(userStatusLabels.disabled, { timeout: 30_000 });

      await cm.page.goto("/admin/settings");
      await expect(cm.page).toHaveURL(/\/admin\/login/);

      const other = await browser.newContext();
      const otherPage = await other.newPage();
      await submitLogin(otherPage, user.email, user.password);
      // The same generic message as a wrong password: login never says "disabled".
      await expect(otherPage.locator('p[role="alert"]')).toHaveText(loginCopy.errors.generic, { timeout: 30_000 });
      await expect(otherPage.locator("body")).not.toContainText(/disabled/i);
    });

    await test.step("enable: access is restored with the same password and sections", async () => {
      await adminPage.getByRole("button", { name: `${usersCopy.actions.enable}: ${user.email}` }).click();
      await confirmButton(adminPage, usersCopy.confirm.enableConfirm).click();
      await expect(row()).toContainText(userStatusLabels.active, { timeout: 30_000 });

      const back = await loginSeeded(browser, user);
      expect(await sidebarLabels(back.page)).toEqual(["Overview", "Settings"]);
      await back.context.close();
    });

    await test.step("reset from the panel: their sessions end, the old password dies, the new one works as set", async () => {
      const open = await loginSeeded(browser, user);
      const newPassword = "panel-reset-password-2026";
      await resetPasswordViaPanel(adminPage, user.email, newPassword);
      await expect(row()).toContainText(userStatusLabels.active, { timeout: 30_000 });

      await open.page.goto("/admin");
      await expect(open.page).toHaveURL(/\/admin\/login/);

      const fresh = await browser.newContext();
      const freshPage = await fresh.newPage();
      await submitLogin(freshPage, user.email, user.password);
      await expect(freshPage.locator('p[role="alert"]')).toHaveText(loginCopy.errors.generic, { timeout: 30_000 });

      await submitLogin(freshPage, user.email, newPassword);
      // No forced change: it goes straight in, with the sections they already had.
      await expect(freshPage).toHaveURL("/admin", { timeout: 90_000 });
      expect(await sidebarLabels(freshPage)).toEqual(["Overview", "Settings"]);
    });

    await test.step("delete: the row goes, and they can no longer log in", async () => {
      await adminPage.goto("/admin/users");
      await adminPage.getByRole("button", { name: `${usersCopy.actions.delete}: ${user.email}` }).click();
      await confirmButton(adminPage, usersCopy.confirm.deleteConfirm).click();
      await expect(row()).toHaveCount(0, { timeout: 30_000 });

      const gone = await browser.newContext();
      const gonePage = await gone.newPage();
      await submitLogin(gonePage, user.email, "panel-reset-password-2026");
      await expect(gonePage.locator('p[role="alert"]')).toHaveText(loginCopy.errors.generic, { timeout: 30_000 });
    });
  });

  test("the main admin's own row offers no Edit, Disable or Delete", async ({ browser }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/users");
    const own = page.getByTestId("user-row").filter({ hasText: E2E_ADMIN.email });
    await expect(own).toContainText(usersCopy.you);
    await expect(own.getByRole("button")).toHaveCount(0);
    await expect(own.getByRole("link", { name: usersCopy.actions.changeOwnPassword })).toBeVisible();
  });

  test("another main admin can be added and then demoted to a content manager in the panel", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const email = "second-admin@example.test";
    await createUserViaUi(page, { email, role: "main_admin" });

    const row = page.getByTestId("user-row").filter({ hasText: email });
    await expect(row).toContainText(usersCopy.table.allSections);

    await page.getByRole("button", { name: `${usersCopy.actions.editAccess}: ${email}` }).click();
    const panel = editUserPanel(page);
    // A main admin has no section tickboxes.
    await expect(panel.getByRole("checkbox")).toHaveCount(0);
    await panel.getByRole("radio", { name: usersCopy.roles.content_manager }).check();
    await expect(panel.getByRole("checkbox")).toHaveCount(5);
    await panel.getByRole("checkbox", { name: "News" }).check();
    await panel.getByRole("button", { name: usersCopy.panel.save }).click();
    await expect(panel).toBeHidden({ timeout: 30_000 });

    await expect(row).toContainText(usersCopy.roles.content_manager);
    await expect(row).toContainText("News");
  });
});

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
} from "./helpers/users";
import { accessCopy, changeRecordCopy, usersCopy } from "../src/content/admin";
import { PERMISSION_KEYS } from "../src/lib/permissions";

test.describe("roles — the record of changes (011 US5)", () => {
  test.beforeEach(async () => {
    await resetUsers();
  });

  test("create, change sections, disable and reset are recorded, newest first, with no password anywhere", async ({
    browser,
  }) => {
    test.setTimeout(480_000);
    const { page } = await adminSession(browser);
    const email = "recorded@example.test";
    const createdWith = "first-typed-password-1";
    const resetTo = "second-typed-password-2";

    await createUserViaUi(page, { email, permissions: ["news"], password: createdWith });

    // Swap News for Messages in the panel.
    await page.getByRole("button", { name: `${usersCopy.actions.editAccess}: ${email}` }).click();
    const panel = editUserPanel(page);
    await panel.getByRole("checkbox", { name: "News" }).uncheck();
    await panel.getByRole("checkbox", { name: "Messages" }).check();
    await panel.getByRole("button", { name: usersCopy.panel.save }).click();
    await expect(panel).toBeHidden({ timeout: 30_000 });

    await page.getByRole("button", { name: `${usersCopy.actions.disable}: ${email}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: usersCopy.confirm.disableConfirm, exact: true }).click();
    await expect(page.getByTestId("user-row").filter({ hasText: email })).toContainText("Disabled", { timeout: 30_000 });

    await resetPasswordViaPanel(page, email, resetTo);

    await page.goto("/admin/users");
    await page.getByRole("link", { name: usersCopy.changeRecord }).click();
    await expect(page).toHaveURL("/admin/users/activity", { timeout: 90_000 });
    await expect(page.getByRole("heading", { name: changeRecordCopy.pageTitle, level: 1 })).toBeVisible();

    const rows = page.getByTestId("change-row");
    await expect(rows).toHaveCount(4);
    // Newest first.
    await expect(rows.nth(0)).toContainText(changeRecordCopy.types.password_set);
    await expect(rows.nth(1)).toContainText(changeRecordCopy.types.disabled);
    await expect(rows.nth(2)).toContainText("Sections: added Messages; removed News");
    await expect(rows.nth(3)).toContainText("Account created (Content manager: News)");
    // Who, to whom.
    for (let i = 0; i < 4; i++) {
      await expect(rows.nth(i)).toContainText(E2E_ADMIN.email);
      await expect(rows.nth(i)).toContainText(email);
    }

    // No password, typed or set, appears on the record.
    const html = await page.content();
    expect(html).not.toContain(createdWith);
    expect(html).not.toContain(resetTo);
  });

  test("a content manager holding every grant cannot open the change record", async ({ browser }) => {
    test.setTimeout(240_000);
    const user = await seedActiveUser({ email: "record-denied@example.test", permissions: [...PERMISSION_KEYS] });
    const { page } = await loginSeeded(browser, user);
    await page.goto("/admin/users/activity");
    await expect(page).toHaveURL("/admin?denied=1");
    await expect(page.getByText(accessCopy.denied)).toBeVisible();
  });

  test("the record starts empty with a clear message", async ({ browser }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/users/activity");
    await expect(page.getByText(changeRecordCopy.empty)).toBeVisible();
  });
});

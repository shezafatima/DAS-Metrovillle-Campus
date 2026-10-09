import { test, expect, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import { addUserPanel, adminSession, resetUsers } from "./helpers/users";
import { accountCopy, usersCopy } from "../src/content/admin";

const SHOW = "Show password";
const HIDE = "Hide password";

/** The password inputs on the page, in DOM order. */
const passwordFields = (page: Page) => page.locator('input[data-slot="password-input"]');

test.describe("one password input with an eye toggle, everywhere (011 FR-039)", () => {
  test.beforeEach(async () => {
    await resetUsers();
  });

  test("login: hidden by default, toggles by mouse and by keyboard, hidden again after submit", async ({ browser }) => {
    test.setTimeout(240_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login");

    const field = page.getByLabel("Password", { exact: true });
    await expect(field).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: SHOW })).toHaveAttribute("aria-pressed", "false");

    await test.step("by mouse", async () => {
      await field.fill("typed-secret-value");
      await page.getByRole("button", { name: SHOW }).click();
      await expect(field).toHaveAttribute("type", "text");
      await expect(field).toHaveValue("typed-secret-value");
      await page.getByRole("button", { name: HIDE }).click();
      await expect(field).toHaveAttribute("type", "password");
    });

    await test.step("by keyboard: Tab to the eye, then Enter and Space", async () => {
      await field.focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: SHOW })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(field).toHaveAttribute("type", "text");
      await expect(page.getByRole("button", { name: HIDE })).toBeFocused();
      await page.keyboard.press("Space");
      await expect(field).toHaveAttribute("type", "password");
    });

    await test.step("it is hidden again once the form is submitted", async () => {
      await page.getByLabel("Email").fill(E2E_ADMIN.email);
      await field.fill("not-the-right-password");
      await page.getByRole("button", { name: SHOW }).click();
      await expect(field).toHaveAttribute("type", "text");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.locator('p[role="alert"]')).toBeVisible({ timeout: 30_000 });
      await expect(field).toHaveAttribute("type", "password");
    });
  });

  test("the main admin's Account page: current, new and confirm each have an eye, hidden by default", async ({ browser }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/account");
    await expect(page.getByRole("heading", { name: accountCopy.pageTitle, level: 1 })).toBeVisible();

    const fields = passwordFields(page);
    await expect(fields).toHaveCount(3);
    for (const i of [0, 1, 2]) await expect(fields.nth(i)).toHaveAttribute("type", "password");

    const eyes = page.getByRole("button", { name: SHOW });
    await expect(eyes).toHaveCount(3);
    await eyes.nth(1).click();
    await expect(fields.nth(0)).toHaveAttribute("type", "password");
    await expect(fields.nth(1)).toHaveAttribute("type", "text");
    await expect(fields.nth(2)).toHaveAttribute("type", "password");

    // Submitting (here: refused client-side as too short) hides it again.
    await page.getByLabel(accountCopy.changePassword.currentLabel, { exact: true }).fill("whatever-current-1");
    await page.getByLabel(accountCopy.changePassword.newLabel, { exact: true }).fill("short");
    await page.getByLabel(accountCopy.changePassword.confirmLabel, { exact: true }).fill("short");
    await page.getByRole("button", { name: accountCopy.changePassword.submit }).click();
    await expect(fields.nth(1)).toHaveAttribute("type", "password");
  });

  test("the user panel: hidden by default, Generate reveals, and closing then reopening hides it again", async ({ browser }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/users");
    await page.getByRole("button", { name: usersCopy.newUser }).click();
    const panel = addUserPanel(page);
    const field = panel.locator("#user-password");
    await expect(field).toHaveAttribute("type", "password");

    await panel.getByRole("button", { name: usersCopy.panel.generate }).click();
    await expect(field).toHaveAttribute("type", "text");
    expect(await field.inputValue()).toHaveLength(20);

    // Closing discards the value (after the warning), and a new panel starts hidden and empty.
    page.once("dialog", (dialog) => void dialog.accept());
    await panel.getByRole("button", { name: usersCopy.panel.cancel }).click();
    await expect(panel).toBeHidden();

    await page.getByRole("button", { name: usersCopy.newUser }).click();
    await expect(field).toHaveAttribute("type", "password");
    await expect(field).toHaveValue("");
  });

  test("pasting still works with the eye in place (main admin, Account page)", async ({ browser }) => {
    test.setTimeout(240_000);
    const { context, page } = await adminSession(browser);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/admin/account");
    const current = page.getByLabel(accountCopy.changePassword.currentLabel, { exact: true });
    await page.evaluate(() => navigator.clipboard.writeText("pasted-in-from-clipboard"));
    await current.focus();
    await page.keyboard.press("Control+V");
    await expect(current).toHaveValue("pasted-in-from-clipboard");
    await expect(current).toHaveAttribute("autocomplete", "current-password");
  });
});

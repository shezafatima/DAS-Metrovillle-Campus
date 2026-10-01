import { test, expect } from "@playwright/test";
import {
  loginSeeded,
  addUserPanel,
  adminSession,
  createUserViaUi,
  getUserRow,
  resetUsers,
  sidebarLabels,
} from "./helpers/users";
import { usersCopy, userStatusLabels } from "../src/content/admin";

const panelCopy = usersCopy.panel;

test.describe("roles — main admin adds a content manager in the right-hand panel (011 US1)", () => {
  test.beforeEach(async () => {
    await resetUsers();
  });

  test("the panel slides in, shows sections only for a content manager, and saving puts the user in the list at once", async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    const email = "new-manager@example.test";

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: usersCopy.pageTitle, level: 1 })).toBeVisible();
    await page.getByRole("button", { name: usersCopy.newUser }).click();

    const panel = addUserPanel(page);
    await expect(panel).toBeVisible();

    await test.step("it is a panel on the right edge, over the list, not a separate page", async () => {
      await expect(page).toHaveURL("/admin/users");
      const viewport = page.viewportSize()!;
      // Wait out the slide-in transition, then it sits flush against the right edge.
      await expect
        .poll(async () => {
          const box = await panel.boundingBox();
          return box ? Math.round(box.x + box.width) : -1;
        })
        .toBe(viewport.width);
      const box = (await panel.boundingBox())!;
      expect(box.width).toBeLessThan(viewport.width);
      expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
      // The list is still there underneath.
      // (Behind a modal the heading is hidden from role queries, but still in the page.)
      await expect(page.locator("h1", { hasText: usersCopy.pageTitle })).toBeAttached();
    });

    await test.step("sections appear only for a content manager, and never include registrations or users", async () => {
      await expect(panel.getByRole("checkbox")).toHaveCount(5);
      await expect(panel).not.toContainText(/registrations/i);
      await panel.getByRole("radio", { name: usersCopy.roles.main_admin }).check();
      await expect(panel.getByRole("checkbox")).toHaveCount(0);
      await panel.getByRole("radio", { name: usersCopy.roles.content_manager }).check();
      await expect(panel.getByRole("checkbox")).toHaveCount(5);
    });

    await test.step("the password is hidden, can be revealed, and Generate fills and reveals one", async () => {
      const field = panel.locator("#user-password");
      await expect(field).toHaveAttribute("type", "password");
      await field.fill("typed-first-attempt");
      await panel.getByRole("button", { name: panelCopy.showPassword }).click();
      await expect(field).toHaveAttribute("type", "text");
      await expect(field).toHaveValue("typed-first-attempt");
      await panel.getByRole("button", { name: panelCopy.hidePassword }).click();
      await expect(field).toHaveAttribute("type", "password");

      await panel.getByRole("button", { name: panelCopy.generate }).click();
      await expect(field).toHaveAttribute("type", "text");
      expect((await field.inputValue()).length).toBe(20);
    });

    const generated = await panel.locator("#user-password").inputValue();
    await panel.getByLabel(panelCopy.emailLabel, { exact: true }).fill(email);
    await panel.getByRole("checkbox", { name: "News" }).check();
    await panel.getByRole("checkbox", { name: "Messages" }).check();
    await panel.getByRole("button", { name: panelCopy.create }).click();

    await test.step("saving closes the panel and the new user is in the list immediately", async () => {
      await expect(panel).toBeHidden({ timeout: 30_000 });
      const row = page.getByTestId("user-row").filter({ hasText: email });
      await expect(row).toBeVisible({ timeout: 30_000 });
      await expect(row).toContainText(usersCopy.roles.content_manager);
      await expect(row).toContainText("News, Messages");
      await expect(row).toContainText(userStatusLabels.active);
      await expect(row).toContainText(usersCopy.table.never);
    });

    await test.step("the password is never shown again: not in the page, after a reload, or in the stored record", async () => {
      expect(await page.content()).not.toContain(generated);
      await page.reload();
      expect(await page.content()).not.toContain(generated);
      expect(JSON.stringify(await getUserRow(email))).not.toContain(generated);
    });
  });

  test("a typed password under 12 characters is refused, and the panel stays open", async ({ browser }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/users");
    await page.getByRole("button", { name: usersCopy.newUser }).click();
    const panel = addUserPanel(page);
    await panel.getByLabel(panelCopy.emailLabel, { exact: true }).fill("short-pw@example.test");
    await panel.locator("#user-password").fill("elevenchars");
    await panel.getByRole("button", { name: panelCopy.create }).click();

    await expect(panel.getByText(usersCopy.errors.invalidPassword)).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("user-row").filter({ hasText: "short-pw@example.test" })).toHaveCount(0);

    await panel.locator("#user-password").fill("twelve-chars");
    await panel.getByRole("button", { name: panelCopy.create }).click();
    await expect(panel).toBeHidden({ timeout: 30_000 });
    await expect(page.getByTestId("user-row").filter({ hasText: "short-pw@example.test" })).toBeVisible();
  });

  test("the same email in other capitals is refused under the email field, and nothing is created", async ({ browser }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    const email = "ayesha@school.pk";
    await createUserViaUi(page, { email });

    await page.getByRole("button", { name: usersCopy.newUser }).click();
    const panel = addUserPanel(page);
    await panel.getByLabel(panelCopy.emailLabel, { exact: true }).fill("  Ayesha@School.PK ");
    await panel.locator("#user-password").fill("a-perfectly-fine-one");
    await panel.getByRole("button", { name: panelCopy.create }).click();

    await expect(panel.getByText(usersCopy.errors.email_taken)).toBeVisible();
    await expect(panel).toBeVisible();
    // Leave without saving: it asks, because something was typed.
    page.once("dialog", (dialog) => void dialog.accept());
    await panel.getByRole("button", { name: panelCopy.cancel }).click();
    await expect(panel).toBeHidden();
    await expect(page.getByTestId("user-row").filter({ hasText: email })).toHaveCount(1);
  });

  test("closing warns first when anything has been typed: Escape, clicking outside, the X and Cancel", async ({ browser }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/users");

    const prompts: string[] = [];
    page.on("dialog", async (dialog) => {
      prompts.push(dialog.message());
      await dialog.dismiss();
    });

    await test.step("nothing typed: Escape closes at once, with no warning", async () => {
      await page.getByRole("button", { name: usersCopy.newUser }).click();
      const panel = addUserPanel(page);
      await expect(panel).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      expect(prompts).toEqual([]);
    });

    await test.step("something typed: each way of closing asks, and 'no' keeps everything as it was", async () => {
      await page.getByRole("button", { name: usersCopy.newUser }).click();
      const panel = addUserPanel(page);
      await expect(panel).toBeVisible();
      await panel.getByLabel(panelCopy.emailLabel, { exact: true }).fill("half-done@example.test");

      await page.keyboard.press("Escape");
      await expect.poll(() => prompts.length).toBe(1);
      await page.mouse.click(5, 300); // on the dimmed list, outside the panel
      await expect.poll(() => prompts.length).toBe(2);
      await panel.getByRole("button", { name: panelCopy.close }).click();
      await expect.poll(() => prompts.length).toBe(3);

      expect(prompts.every((message) => message === panelCopy.discardPrompt)).toBe(true);
      await expect(panel).toBeVisible();
      await expect(panel.getByLabel(panelCopy.emailLabel, { exact: true })).toHaveValue("half-done@example.test");
    });

    await test.step("'yes' on Cancel closes it, and reopening starts empty", async () => {
      page.removeAllListeners("dialog");
      page.once("dialog", (dialog) => void dialog.accept());
      await addUserPanel(page).getByRole("button", { name: panelCopy.cancel }).click();
      await expect(addUserPanel(page)).toBeHidden();

      await page.getByRole("button", { name: usersCopy.newUser }).click();
      await expect(addUserPanel(page).getByLabel(panelCopy.emailLabel, { exact: true })).toHaveValue("");
    });
  });

  test("the user logs in with the password the admin set, and it works as it stands (no forced change)", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page: adminPage } = await adminSession(browser);
    const user = await createUserViaUi(adminPage, {
      email: "onboard@example.test",
      permissions: ["news"],
      password: "typed-by-the-admin-2026",
    });
    expect(user.temporaryPassword).toBe("typed-by-the-admin-2026");

    // Straight to the overview: no "set your password" step, and only their sections.
    const { page } = await loginSeeded(browser, { email: user.email, password: user.temporaryPassword });
    await expect(page).toHaveURL("/admin");
    expect(await sidebarLabels(page)).toEqual(["Overview", "News"]);

    // The main admin now sees a last login.
    await adminPage.goto("/admin/users");
    const row = adminPage.getByTestId("user-row").filter({ hasText: user.email });
    await expect(row).toContainText(userStatusLabels.active);
    await expect(row).not.toContainText(usersCopy.table.never);
  });

  test("a main admin can be added, and is listed with all sections", async ({ browser }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    await createUserViaUi(page, { email: "second-admin@example.test", role: "main_admin" });
    const row = page.getByTestId("user-row").filter({ hasText: "second-admin@example.test" });
    await expect(row).toContainText(usersCopy.roles.main_admin);
    await expect(row).toContainText(usersCopy.table.allSections);
  });
});

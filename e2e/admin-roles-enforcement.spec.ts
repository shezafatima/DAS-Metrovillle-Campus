import { test, expect, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import {
  adminSession,
  clearMessagesAndSignups,
  editUserPanel,
  loginSeeded,
  resetUsers,
  seedActiveUser,
  seedMessageAndSignup,
  sidebarLabels,
} from "./helpers/users";
import { accessCopy, accountCopy, usersCopy } from "../src/content/admin";
import { PERMISSION_KEYS } from "../src/lib/permissions";

const UNKNOWN_ID = "507f1f77bcf86cd799439011";

async function expectDenied(page: Page, path: string) {
  await page.goto(path);
  await expect(page, path).toHaveURL("/admin?denied=1");
  await expect(page.getByText(accessCopy.denied)).toBeVisible();
}

test.describe("roles — permissions are enforced everywhere (011 US3)", () => {
  test.beforeEach(async () => {
    await resetUsers();
    await clearMessagesAndSignups();
  });

  test("a content manager with only News sees only News, is refused elsewhere, and cannot read other sections' data", async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    await seedMessageAndSignup();
    const user = await seedActiveUser({ email: "news-only@example.test", permissions: ["news"] });
    const { page } = await loginSeeded(browser, user);

    await test.step("the shell shows only what they may use", async () => {
      expect(await sidebarLabels(page)).toEqual(["Overview", "News"]);
      const main = page.locator("#admin-content");
      await expect(main).toContainText("News");
      await expect(main).not.toContainText("Messages");
      await expect(main).not.toContainText("Signups");
      await expect(main).not.toContainText("Users");
    });

    await test.step("the notification bell carries no message or signup data", async () => {
      await page.getByRole("button", { name: /Notifications/ }).click();
      const panel = page.getByRole("dialog", { name: /Notifications/ });
      await expect(panel).toBeVisible();
      await expect(panel).not.toContainText("Sara Leakcheck");
      await expect(panel).not.toContainText("Ali Leakcheck");
      await page.keyboard.press("Escape");
      const response = await page.request.get("/api/admin/notifications");
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ messagesNew: 0, signupsNew: 0, items: [] });
    });

    await test.step("pages they lack redirect to the overview with a clear message", async () => {
      for (const path of [
        "/admin/messages",
        `/admin/messages/${UNKNOWN_ID}`,
        "/admin/signups",
        "/admin/settings",
        "/admin/users",
        "/admin/users/activity",
        "/admin/design-system",
      ]) {
        await expectDenied(page, path);
      }
    });

    await test.step("requests for sections they lack are refused with no data", async () => {
      const refused = [
        await page.request.get("/api/admin/signups/export"),
        await page.request.patch(`/api/admin/messages/${UNKNOWN_ID}`, { data: { status: "read" } }),
        await page.request.delete(`/api/admin/messages/${UNKNOWN_ID}`),
        await page.request.post(`/api/admin/messages/${UNKNOWN_ID}/read`),
        await page.request.delete(`/api/admin/signups/${UNKNOWN_ID}`),
        await page.request.post("/api/admin/signups/opened"),
      ];
      for (const response of refused) {
        expect(response.status(), response.url()).toBe(403);
        expect(await response.json()).toEqual({ error: "forbidden" });
      }
      const exportBody = await (await page.request.get("/api/admin/signups/export")).text();
      expect(exportBody).not.toContain("Leakcheck");
      expect(exportBody).not.toContain("ali-leak@example.test");
    });

    await test.step("the section they do have works", async () => {
      await page.goto("/admin/news");
      await expect(page).toHaveURL("/admin/news");
      const created = await page.request.post("/api/admin/news", { data: {} });
      // Access passed: the empty body then fails validation, not authorization.
      expect(created.status()).toBe(400);
    });
  });

  test("holding every grant still never reaches users, the change record or registrations", async ({ browser }) => {
    test.setTimeout(300_000);
    const user = await seedActiveUser({ email: "all-grants@example.test", permissions: [...PERMISSION_KEYS] });
    const { page } = await loginSeeded(browser, user);

    expect(await sidebarLabels(page)).toEqual(["Overview", "News", "Messages", "Signups", "Settings"]);
    for (const path of ["/admin/users", "/admin/users/activity", "/admin/design-system"]) {
      await expectDenied(page, path);
    }
  });

  test("a content manager with no grants sees only the overview and their own Account page", async ({ browser }) => {
    test.setTimeout(300_000);
    const user = await seedActiveUser({ email: "no-grants@example.test" });
    const { page } = await loginSeeded(browser, user);

    expect(await sidebarLabels(page)).toEqual(["Overview"]);
    await expect(page.locator("#admin-content")).toContainText(accessCopy.noGrants);

    await page.goto("/admin/account");
    await expect(page).toHaveURL("/admin/account");
    await expect(page.getByRole("heading", { name: accountCopy.pageTitle, level: 1 })).toBeVisible();
    await expect(page.getByText(user.email)).toBeVisible();

    for (const path of ["/admin/news", "/admin/messages", "/admin/signups", "/admin/settings"]) {
      await expectDenied(page, path);
    }
  });

  test("a permission change applies to every open browser on the next request, without logging out", async ({ browser }) => {
    test.setTimeout(300_000);
    const user = await seedActiveUser({ email: "two-browsers@example.test", permissions: ["news"] });
    const first = await loginSeeded(browser, user);
    const second = await loginSeeded(browser, user);
    for (const { page } of [first, second]) {
      await page.goto("/admin/news");
      await expect(page).toHaveURL("/admin/news");
    }

    // The main admin removes News and grants Messages, through the Users page.
    const { page: adminPage } = await adminSession(browser);
    await adminPage.goto("/admin/users");
    const row = adminPage.getByTestId("user-row").filter({ hasText: user.email });
    await row.getByRole("button", { name: `${usersCopy.actions.editAccess}: ${user.email}` }).click();
    const panel = editUserPanel(adminPage);
    await expect(panel).toBeVisible();
    await panel.getByRole("checkbox", { name: "News" }).uncheck();
    await panel.getByRole("checkbox", { name: "Messages" }).check();
    await panel.getByRole("button", { name: usersCopy.panel.save }).click();
    await expect(panel).toBeHidden({ timeout: 30_000 });

    for (const { page } of [first, second]) {
      await expectDenied(page, "/admin/news");
      await page.goto("/admin/messages");
      await expect(page).toHaveURL("/admin/messages");
      expect(await sidebarLabels(page)).toEqual(["Overview", "Messages"]);
      expect((await page.request.get("/api/admin/signups/export")).status()).toBe(403);
      // Still the same login: no redirect to the login page happened.
      expect(page.url()).not.toContain("/admin/login");
    }
  });

  test("the seeded main admin still sees everything, Users included", async ({ browser }) => {
    test.setTimeout(240_000);
    const { page } = await adminSession(browser);
    expect(await sidebarLabels(page)).toEqual(["Overview", "News", "Messages", "Signups", "Settings", "Users"]);
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: usersCopy.pageTitle, level: 1 })).toBeVisible();
    await expect(page.getByTestId("user-row").filter({ hasText: E2E_ADMIN.email })).toContainText(usersCopy.you);
  });
});

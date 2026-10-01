import { test, expect, type Page } from "@playwright/test";
import {
  addUserPanel,
  adminSession,
  editUserPanel,
  resetUsers,
  seedActiveUser,
} from "./helpers/users";
import { usersCopy } from "../src/content/admin";

const WIDTHS = [375, 768, 1024, 1440] as const;
const HEIGHT = 900;

/** Nothing pushes the page sideways. */
async function expectNoHorizontalScroll(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${where}: horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(0);
}

/** Every visible button/input inside `root` lies within the viewport horizontally. */
async function expectControlsInView(page: Page, selector: string, where: string) {
  const outside = await page.evaluate((sel) => {
    const width = window.innerWidth;
    return Array.from(document.querySelectorAll(`${sel} button, ${sel} input, ${sel} a`))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0 && (r.left < -1 || r.right > width + 1))
      .length;
  }, selector);
  expect(outside, `${where}: ${outside} controls outside the viewport`).toBe(0);
}

test.describe("roles — layout at 375, 768, 1024 and 1440px (011 FR-035, SC-009)", () => {
  test.beforeEach(async () => {
    await resetUsers();
  });

  test("Users page, right-hand panel, change record and Account page", async ({ browser }) => {
    test.setTimeout(900_000);
    // A long email and every kind of row, so the list has something wide to hold.
    await seedActiveUser({ email: "a-rather-long-address-for-layout-checking@long-domain-name.example.test", permissions: ["news", "messages", "careers", "settings", "pages"] });
    await seedActiveUser({ email: "plain@example.test", permissions: ["news"] });
    await seedActiveUser({ email: "boss@example.test", role: "main_admin" });

    const { context, page } = await adminSession(browser);

    for (const width of WIDTHS) {
      await context.pages()[0]!.setViewportSize({ width, height: HEIGHT });
      const phone = width < 640;

      await test.step(`${width}px: the Users list is a table from 1280px and cards below, with no sideways scroll`, async () => {
        await page.goto("/admin/users");
        await expect(page.getByRole("heading", { name: usersCopy.pageTitle, level: 1 })).toBeVisible();
        if (width < 1280) {
          await expect(page.getByTestId("user-card").first()).toBeVisible();
          await expect(page.getByTestId("user-row").first()).toBeHidden();
        } else {
          await expect(page.getByTestId("user-row").first()).toBeVisible();
          await expect(page.getByTestId("user-card").first()).toBeHidden();
        }
        await expectNoHorizontalScroll(page, `Users at ${width}px`);
        await expectControlsInView(page, "#admin-content", `Users at ${width}px`);
      });

      await test.step(`${width}px: the Add user panel is ${phone ? "full width" : "a side panel"}, and everything in it is reachable`, async () => {
        await page.getByRole("button", { name: usersCopy.newUser }).click();
        const panel = addUserPanel(page);
        await expect(panel).toBeVisible();
        // Wait for the slide-in to finish.
        await expect
          .poll(async () => {
            const box = await panel.boundingBox();
            return box ? Math.round(box.x + box.width) : -1;
          })
          .toBe(width);
        const box = (await panel.boundingBox())!;
        if (phone) expect(Math.round(box.width), `panel width at ${width}px`).toBe(width);
        else expect(box.width, `panel width at ${width}px`).toBeLessThan(width);
        expect(Math.round(box.x + box.width)).toBe(width); // flush against the right edge

        // Every field and button can be reached (scrolls inside the panel if it must).
        for (const control of [
          panel.getByLabel(usersCopy.panel.emailLabel, { exact: true }),
          panel.getByRole("radio", { name: usersCopy.roles.main_admin }),
          panel.getByRole("checkbox", { name: "News" }),
          panel.locator("#user-password"),
          panel.getByRole("button", { name: usersCopy.panel.generate }),
          panel.getByRole("button", { name: usersCopy.panel.showPassword }),
          panel.getByRole("button", { name: usersCopy.panel.cancel }),
          panel.getByRole("button", { name: usersCopy.panel.create }),
        ]) {
          await control.scrollIntoViewIfNeeded();
          await expect(control).toBeVisible();
        }
        await expectNoHorizontalScroll(page, `Add user panel at ${width}px`);
        await expectControlsInView(page, '[data-slot="sheet-content"]', `Add user panel at ${width}px`);

        // Generated (and revealed) password stays inside its field: no overflow either.
        await panel.getByRole("button", { name: usersCopy.panel.generate }).click();
        await expectNoHorizontalScroll(page, `Add user panel with a revealed password at ${width}px`);

        await page.keyboard.press("Escape");
        // The panel has something typed (the generated password) so it asks: leave it.
        page.once("dialog", (dialog) => void dialog.accept());
        await panel.getByRole("button", { name: usersCopy.panel.cancel }).click();
        await expect(panel).toBeHidden();
      });

      await test.step(`${width}px: the Edit panel`, async () => {
        await page.getByRole("button", { name: /^Edit: plain@example\.test$/ }).click();
        const panel = editUserPanel(page);
        await expect(panel).toBeVisible();
        await expect
          .poll(async () => {
            const box = await panel.boundingBox();
            return box ? Math.round(box.x + box.width) : -1;
          })
          .toBe(width);
        await expectNoHorizontalScroll(page, `Edit panel at ${width}px`);
        await expectControlsInView(page, '[data-slot="sheet-content"]', `Edit panel at ${width}px`);
        await panel.getByRole("button", { name: usersCopy.panel.cancel }).click();
        await expect(panel).toBeHidden();
      });

      await test.step(`${width}px: the change record`, async () => {
        await page.goto("/admin/users/activity");
        await expectNoHorizontalScroll(page, `Change record at ${width}px`);
      });

      await test.step(`${width}px: the Account page with its password fields`, async () => {
        await page.goto("/admin/account");
        await expect(page.locator("input[data-slot=password-input]").first()).toBeVisible();
        await page.getByRole("button", { name: "Show password" }).first().click();
        await expectNoHorizontalScroll(page, `Account at ${width}px`);
      });
    }
  });
});

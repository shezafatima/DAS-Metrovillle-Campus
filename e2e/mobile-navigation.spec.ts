import { test, expect } from "@playwright/test";

const MOBILE_VIEWPORTS = [
  { name: "375px", width: 375, height: 800 },
  { name: "768px", width: 768, height: 1024 },
];

const MENU_ITEMS = [
  "Home",
  "About",
  "Careers",
  "Academics",
  "Admission",
  "Resources",
  "News",
  "Contact",
];

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`Mobile navigation at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("the full menu is hidden and a menu button is shown instead", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(
        page.getByRole("navigation", { name: "Main menu" })
      ).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Open menu" })
      ).toBeVisible();
    });

    test("opening the menu button lists every top-level item", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("navigation", { name: "Mobile menu" });
      await expect(menu).toBeVisible();
      for (const label of MENU_ITEMS) {
        await expect(
          menu.getByRole("link", { name: label }).or(menu.getByRole("button", { name: label }))
        ).toBeVisible();
      }
    });

    // navigationItems (src/content/site-shell.ts) currently has no item with
    test("an item with sub-pages expands and collapses in place", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("navigation", { name: "Mobile menu" });
      const aboutTrigger = menu.getByRole("button", { name: "About" });

      await expect(menu.getByRole("link", { name: "Overview" })).toBeHidden();
      await aboutTrigger.click();
      await expect(menu.getByRole("link", { name: "Overview" })).toBeVisible();

      await aboutTrigger.click();
      await expect(menu.getByRole("link", { name: "Overview" })).toBeHidden();
    });

    test("closes via link selection, the close control, and Escape", async ({
      page,
    }) => {
      await page.goto("/");
      const menuButton = page.getByRole("button", { name: "Open menu" });

      // Close control.
      await menuButton.click();
      await expect(page.getByRole("navigation", { name: "Mobile menu" })).toBeVisible();
      await page.getByRole("button", { name: "Close menu" }).click();
      await expect(page.getByRole("navigation", { name: "Mobile menu" })).toBeHidden();

      // Escape key.
      await menuButton.click();
      await expect(page.getByRole("navigation", { name: "Mobile menu" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("navigation", { name: "Mobile menu" })).toBeHidden();

      // Link selection (Careers has no sub-pages, so it's a plain link).
      await menuButton.click();
      const menu = page.getByRole("navigation", { name: "Mobile menu" });
      await menu.getByRole("link", { name: "Careers" }).click();
      await expect(page).toHaveURL("/careers");
      await expect(page.getByRole("navigation", { name: "Mobile menu" })).toBeHidden();
    });

    test("the page behind does not scroll while the menu is open", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("navigation", { name: "Mobile menu" })).toBeVisible();
      const overflow = await page.evaluate(
        () => getComputedStyle(document.body).overflow
      );
      expect(overflow).toBe("hidden");
    });

    test("keyboard focus stays inside the menu and returns to the menu button on close", async ({
      page,
    }) => {
      await page.goto("/");
      const menuButton = page.getByRole("button", { name: "Open menu" });
      await menuButton.click();
      const closeButton = page.getByRole("button", { name: "Close menu" });
      await expect(closeButton).toBeVisible();

      // Tabbing inside the (modal) menu should never escape it.
      for (let i = 0; i < 15; i += 1) {
        await page.keyboard.press("Tab");
      }
      const activeIsInsideMenu = await page.evaluate(() => {
        const menu = document.querySelector('nav[aria-label="Mobile menu"]');
        return !!menu && menu.contains(document.activeElement);
      });
      expect(activeIsInsideMenu).toBe(true);

      await page.keyboard.press("Escape");
      await expect(menuButton).toBeFocused();
    });
  });
}

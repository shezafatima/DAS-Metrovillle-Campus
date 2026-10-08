import { test, expect } from "@playwright/test";

const DESKTOP_VIEWPORTS = [
  { name: "1024px", width: 1024, height: 900 },
  { name: "1440px", width: 1440, height: 900 },
];

const MENU_ITEMS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Campuses", href: "/campuses" },
  { label: "Academics", href: "/academics" },
  { label: "Admission", href: "/admission" },
  { label: "Resources", href: "/resources" },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" },
];

for (const viewport of DESKTOP_VIEWPORTS) {
  test.describe(`Desktop navigation at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("the logo returns visitors home", async ({ page }) => {
      await page.goto("/about");
      await page
        .getByRole("link", { name: /Dar-e-Arqam School Metroville Campus/i })
        .click();
      await expect(page).toHaveURL("/");
    });

    test("the main menu renders in the fixed order", async ({ page }) => {
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: "Main menu" });
      // Labels only (no taglines). Dropdown links are hidden while closed, so
      // only the top-level links are in the accessibility tree.
      const items = await nav.getByRole("link").allTextContents();
      expect(items.map((text) => text.trim())).toEqual(MENU_ITEMS.map((item) => item.label));
    });

    test("the current page's menu item is marked active", async ({ page }) => {
      await page.goto("/about");
      const nav = page.getByRole("navigation", { name: "Main menu" });
      await expect(nav.getByRole("link", { name: "About" })).toHaveAttribute(
        "aria-current",
        "page"
      );
      await expect(
        nav.getByRole("link", { name: "Home" })
      ).not.toHaveAttribute("aria-current");
    });

    test("a menu item with sub-pages opens and closes its dropdown", async ({
      page,
    }) => {
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: "Main menu" });
      const trigger = nav.locator('a[aria-haspopup="true"]').first();

      await trigger.hover();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");

      await page.mouse.move(0, 0);
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    test("every menu item reaches its page", async ({ page }) => {
      for (const item of MENU_ITEMS) {
        await page.goto("/");
        const nav = page.getByRole("navigation", { name: "Main menu" });
        await nav.getByRole("link", { name: item.label }).click();
        await expect(page).toHaveURL(item.href);
      }
    });

    // Token fidelity (FR-024, SC-003) — matches the "Main menu item" row of
    // research/design-tokens.md's Type scale table (Roboto Condensed / 16px /
    // 700 / #121291), and the container gutter from its Container widths
    // table (30px), as encoded into src/app/globals.css's @theme tokens.
    test("the main menu's computed style matches research/design-tokens.md", async ({
      page,
    }) => {
      // /about: the header is solid there (it is transparent with white links over the home hero),
      // and About is the active item, which is the navy one (inactive items are the body text colour).
      await page.goto("/about");
      const activeLabel = page
        .getByRole("navigation", { name: "Main menu" })
        .getByRole("link", { name: "About", exact: true })
        .locator("span")
        .first();
      const style = await activeLabel.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          color: cs.color,
        };
      });
      expect(style.fontFamily).toContain("Roboto Condensed");
      expect(style.fontSize).toBe("16px");
      expect(style.fontWeight).toBe("700");
      expect(style.color).toBe("rgb(18, 18, 145)");

      const gutter = await page
        .locator("header > div:not([aria-hidden])")
        .evaluate((el) => getComputedStyle(el).paddingLeft);
      expect(gutter).toBe("30px");
    });
  });
}

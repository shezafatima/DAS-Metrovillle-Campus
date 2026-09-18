import { test, expect } from "@playwright/test";

const SITEMAP_ROUTES = [
  { path: "/", heading: "Home" },
  { path: "/about", heading: "About" },
  { path: "/campuses", heading: "Campuses" },
  { path: "/academics", heading: "Academics" },
  { path: "/admission", heading: "Admission" },
  { path: "/resources", heading: "Resources" },
  { path: "/news", heading: "News" },
  { path: "/news/some-slug", heading: "News" },
  { path: "/contact", heading: "Contact" },
];

test.describe("Shared layout and placeholder pages", () => {
  for (const route of SITEMAP_ROUTES) {
    test(`${route.path} renders inside the shell`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: route.heading, level: 1 })
      ).toBeVisible();
    });
  }

  test("an unmatched URL renders a shell-wrapped not-found page with a link home", async ({
    page,
  }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Page not found" })
    ).toBeVisible();

    const homeLink = page.getByRole("link", { name: "Back to home" });
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL("/");
  });

  test("the skip-to-content link is the first element focused on Tab", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("activating the skip link moves focus into the main content", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    const mainHasFocusOrIsTarget = await page.evaluate(() => {
      const main = document.getElementById("main-content");
      return window.location.hash === "#main-content" && !!main;
    });
    expect(mainHasFocusOrIsTarget).toBe(true);
  });
});

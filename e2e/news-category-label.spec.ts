import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { clearPosts, seedPosts } from "./helpers/news";

const OLD_CATEGORY_URLS = ["head-office", "events", "activities", "achievements", "announcements"];

test.describe("news category label", () => {
  test.beforeEach(async () => {
    await clearPosts();
  });

  test("old category addresses redirect permanently to /news", async ({ request }) => {
    for (const key of OLD_CATEGORY_URLS) {
      const response = await request.get(`/news/${key}`, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(new URL(response.headers()["location"], "http://x").pathname).toBe("/news");
    }
  });

  test("the News menu item is a plain link with no dropdown", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main menu" });
    await expect(nav.getByRole("link", { name: "News" })).not.toHaveAttribute("aria-haspopup", "true");
    await expect(nav.getByRole("link", { name: "Events" })).toHaveCount(0);
  });

  test("every card shows its category as a plain-text label, and the detail page does too", async ({ page }) => {
    await seedPosts([
      { title: "Head Office Notice", slug: "head-office-notice", category: "head-office" },
      { title: "Sports Event", slug: "sports-event", category: "events" },
      { title: "اردو خبر", slug: "urdu-news", language: "ur", category: "achievements" },
    ]);
    await page.goto("/news");
    const labels = await page.getByTestId("category-label").allTextContents();
    expect([...labels].sort()).toEqual(["Achievements", "Events", "Head Office"]);
    await expect(page.getByRole("link", { name: "Events", exact: true })).toHaveCount(0);
    await expect(page.getByText("Head Office Notice")).toBeVisible();

    await page.goto("/news/sports-event");
    await expect(page.getByTestId("category-label")).toHaveText("Events");
  });

  for (const width of [375, 768, 1024, 1440]) {
    test(`no sideways scroll and no axe violations at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await seedPosts([
        { title: "Sports Event", slug: "sports-event", category: "events" },
        { title: "اردو خبر", slug: "urdu-news", language: "ur", category: "announcements" },
      ]);
      for (const path of ["/news", "/news/sports-event"]) {
        await page.goto(path);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
        const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      }
    });
  }
});

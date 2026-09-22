import { test, expect } from "@playwright/test";
import { clearPosts, seedPosts } from "./helpers/news";

test.describe("public news categories (US7)", () => {
  test.beforeEach(async () => {
    await clearPosts();
  });

  test("card meta links to the category, and the category page lists only that category", async ({
    page,
  }) => {
    await seedPosts([
      { title: "Head Office Notice", slug: "head-office-notice", category: "head-office" },
      { title: "Sports Event", slug: "sports-event", category: "events" },
      { title: "Team Activity", slug: "team-activity", category: "activities" },
    ]);

    await page.goto("/news");
    await expect(page.getByRole("link", { name: "Head Office" }).first()).toBeVisible();

    await page.goto("/news/events");
    await expect(page.getByRole("heading", { name: "Events", level: 1 })).toBeVisible();
    await expect(page).toHaveTitle("Events — News");
    await expect(page.getByText("Sports Event")).toBeVisible();
    await expect(page.getByText("Head Office Notice")).toHaveCount(0);
    await expect(page.getByText("Team Activity")).toHaveCount(0);
  });

  test("paginates within a category", async ({ page }) => {
    const posts = Array.from({ length: 10 }, (_, i) => ({
      title: `Events Post ${i}`,
      slug: `events-post-${i}`,
      category: "events" as const,
    }));
    await seedPosts(posts);
    await page.goto("/news/events");
    await expect(page.locator("article")).toHaveCount(9);
    await page.goto("/news/events?page=2");
    await expect(page.locator("article")).toHaveCount(1);
  });

  test('"All" returns to the full unfiltered list', async ({ page }) => {
    await seedPosts([{ title: "Any Post", slug: "any-post", category: "announcements" }]);
    await page.goto("/news/announcements");
    await page.getByRole("link", { name: "All", exact: true }).click();
    await expect(page).toHaveURL("/news");
  });

  test("a category with no posts shows the empty state", async ({ page }) => {
    await seedPosts([{ title: "Only Events Post", slug: "only-events-post", category: "events" }]);
    await page.goto("/news/achievements");
    await expect(page.getByText("No news yet")).toBeVisible();
  });

  test("an unknown category address returns page not found", async ({ page }) => {
    const response = await page.goto("/news/nonsense-category");
    expect(response?.status()).toBe(404);
  });
});

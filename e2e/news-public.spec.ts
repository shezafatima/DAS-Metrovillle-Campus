import { test, expect } from "@playwright/test";
import { clearPosts, seedPosts } from "./helpers/news";

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

test.describe("public news list (US3)", () => {
  test.beforeEach(async () => {
    await clearPosts();
  });

  test("lists only published, current posts newest first with cover/placeholder, date, excerpt, Read More", async ({
    page,
  }) => {
    await seedPosts([
      { title: "Draft Post", slug: "draft-post", status: "draft" },
      {
        title: "Future Post",
        slug: "future-post",
        status: "published",
        publishDate: daysFromNow(1),
      },
      {
        title: "Newer Visible Post",
        slug: "newer-visible-post",
        status: "published",
        publishDate: daysFromNow(0),
      },
      {
        title: "Older Visible Post",
        slug: "older-visible-post",
        status: "published",
        publishDate: daysFromNow(-1),
      },
    ]);

    await page.goto("/news");
    await expect(page.getByRole("heading", { name: "News", exact: true })).toBeVisible();

    const cards = page.locator("article");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("Newer Visible Post");
    await expect(cards.nth(1)).toContainText("Older Visible Post");
    await expect(page.getByText("Draft Post")).toHaveCount(0);
    await expect(page.getByText("Future Post")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Read More/ }).first()).toBeVisible();
  });

  test("shows the tenth post on page 2", async ({ page }) => {
    const posts = Array.from({ length: 10 }, (_, i) => ({
      title: `Pagination Post ${i}`,
      slug: `pagination-post-${i}`,
      status: "published" as const,
      publishDate: daysFromNow(-i),
    }));
    await seedPosts(posts);

    await page.goto("/news");
    await expect(page.locator("article")).toHaveCount(9);

    await page.goto("/news?page=2");
    await expect(page.locator("article")).toHaveCount(1);
    await expect(page.getByText("Pagination Post 9")).toBeVisible();
  });

  test("shows a friendly empty state when nothing is published", async ({ page }) => {
    await page.goto("/news");
    await expect(page.getByText("No news yet")).toBeVisible();
  });

  for (const width of [375, 768, 1024, 1440]) {
    test(`has no horizontal scroll at ${width}px`, async ({ page }) => {
      await seedPosts([{ title: "Layout Check Post", slug: "layout-check-post" }]);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/news");
      const overflowing = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflowing).toBe(false);
    });
  }

  test("shows the expected column count per width", async ({ page }) => {
    await seedPosts(
      Array.from({ length: 3 }, (_, i) => ({
        title: `Column Post ${i}`,
        slug: `column-post-${i}`,
        publishDate: daysFromNow(-i),
      })),
    );

    async function columnsAt(width: number) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/news");
      const tops = await page.locator("article").evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().top),
      );
      const first = tops[0];
      return tops.filter((t) => Math.abs(t - first) < 2).length;
    }

    expect(await columnsAt(375)).toBe(1);
    expect(await columnsAt(768)).toBe(2);
    expect(await columnsAt(1024)).toBe(3);
    expect(await columnsAt(1440)).toBe(3);
  });
});

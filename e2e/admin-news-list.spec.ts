import { test, expect } from "@playwright/test";
import { loginAsAdmin, seedPosts, clearPosts } from "./helpers/news";

test.describe("admin news list (US2)", () => {
  test.beforeEach(async () => {
    await clearPosts();
  });

  test("orders posts newest first, marks a future-dated post as scheduled", async ({ page }) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setUTCDate(today.getUTCDate() + 1);
    const yesterday = new Date();
    yesterday.setUTCDate(today.getUTCDate() - 1);

    await seedPosts([
      { title: "Oldest Post", slug: "oldest-post", publishDate: yesterday, status: "published" },
      {
        title: "Scheduled Post",
        slug: "scheduled-post",
        publishDate: tomorrow,
        status: "published",
      },
      { title: "Newest Post", slug: "newest-post", publishDate: today, status: "published" },
    ]);

    await loginAsAdmin(page);
    await page.goto("/admin/news");

    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Scheduled Post");
    await expect(rows.nth(0)).toContainText("Scheduled");
    await expect(rows.nth(1)).toContainText("Newest Post");
    await expect(rows.nth(2)).toContainText("Oldest Post");
  });

  test("searches by title in English and Urdu", async ({ page }) => {
    await seedPosts([
      { title: "Winter Break Notice", slug: "winter-break" },
      { title: "فکر اقبال اور تعلیمی نظام", slug: "urdu-post" },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/news");

    await page.getByLabel("Search by title…").fill("winter");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("Winter Break Notice");

    await page.getByLabel("Search by title…").fill("تعلیمی");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("فکر اقبال اور تعلیمی نظام");
  });

  test("filters by status", async ({ page }) => {
    await seedPosts([
      { title: "Draft Post", slug: "draft-post", status: "draft" },
      { title: "Published Post", slug: "published-post", status: "published" },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/news");

    await page.getByLabel("Status").selectOption("draft");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("Draft Post");
  });

  test("a very long title is truncated with an ellipsis and a title attribute", async ({ page }) => {
    const longTitle = "A very long news title that goes on and on ".repeat(5).trim().slice(0, 200);
    await seedPosts([{ title: longTitle, slug: "long-title-post" }]);
    await loginAsAdmin(page);
    await page.goto("/admin/news");

    const titleLink = page.locator("table tbody tr td a").first();
    await expect(titleLink).toHaveAttribute("title", longTitle);
    const overflow = await titleLink.evaluate((el) => getComputedStyle(el).textOverflow);
    expect(overflow).toBe("ellipsis");
  });

  test("deletes a post after confirmation; the public address then returns not found", async ({
    page,
  }) => {
    await seedPosts([{ title: "To Be Deleted", slug: "to-be-deleted", status: "published" }]);
    await loginAsAdmin(page);
    await page.goto("/admin/news");

    await page.getByRole("button", { name: /Delete: To Be Deleted/ }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.locator("table tbody tr", { hasText: "To Be Deleted" })).toHaveCount(0);
    await expect(page.getByText("Deleted.")).toBeVisible();

    await page.goto("/news/to-be-deleted");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("category filter combines with search and status", async ({ page }) => {
    await seedPosts([
      { title: "Events Draft", slug: "events-draft", category: "events", status: "draft" },
      { title: "Events Published", slug: "events-published", category: "events", status: "published" },
      { title: "Activities Draft", slug: "activities-draft", category: "activities", status: "draft" },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/news?category=events&status=draft");

    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("Events Draft");
  });

  test("cancelling the delete dialog leaves the post untouched", async ({ page }) => {
    await seedPosts([{ title: "Keep Me", slug: "keep-me" }]);
    await loginAsAdmin(page);
    await page.goto("/admin/news");

    await page.getByRole("button", { name: /Delete: Keep Me/ }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.locator("table tbody tr", { hasText: "Keep Me" })).toHaveCount(1);
  });
});

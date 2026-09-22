import { test, expect } from "@playwright/test";
import { clearPosts, seedPosts } from "./helpers/news";

test.describe("public news detail (US3, US6)", () => {
  test.beforeEach(async () => {
    await clearPosts();
  });

  test("renders title, date, cover image, and formatted body", async ({ page }) => {
    await seedPosts([
      {
        title: "Detailed Post",
        slug: "detailed-post",
        bodyHtml:
          '<h2>A heading</h2><ul><li>One</li><li>Two</li></ul><p>Read more at <a href="https://example.com">example.com</a>.</p>',
        coverImage: {
          url: "https://res.cloudinary.com/demo/image/upload/v1/news/covers/detail.jpg",
          publicId: "news/covers/detail",
          width: 1200,
          height: 630,
          alt: "A descriptive caption",
        },
      },
    ]);

    await page.goto("/news/detailed-post");
    await expect(page.getByRole("heading", { name: "Detailed Post", level: 1 })).toBeVisible();
    await expect(page.getByRole("img", { name: "A descriptive caption" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "A heading", level: 2 })).toBeVisible();
    await expect(page.locator("ul li")).toHaveCount(2);

    const link = page.getByRole("link", { name: "example.com" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("returns page not found for a nonexistent address", async ({ page }) => {
    const response = await page.goto("/news/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("returns page not found for a draft, future, or deleted post", async ({ page }) => {
    await seedPosts([
      { title: "Hidden Draft", slug: "hidden-draft", status: "draft" },
    ]);
    const response = await page.goto("/news/hidden-draft");
    expect(response?.status()).toBe(404);
  });

  test("post page metadata includes title, description, and Open Graph image", async ({ page }) => {
    await seedPosts([
      {
        title: "Metadata Post",
        slug: "metadata-post",
        bodyHtml: "<p>A post with a cover image for social sharing.</p>",
        coverImage: {
          url: "https://res.cloudinary.com/demo/image/upload/v1/news/covers/meta.jpg",
          publicId: "news/covers/meta",
          width: 1200,
          height: 630,
          alt: "Cover",
        },
      },
    ]);

    await page.goto("/news/metadata-post");
    await expect(page).toHaveTitle("Metadata Post");
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /A post with a cover image/);
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /c_fill,w_1200,h_630/);
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute("content", "article");
  });

  test("news list page 2 has a distinct title", async ({ page }) => {
    const posts = Array.from({ length: 10 }, (_, i) => ({
      title: `Title Page Post ${i}`,
      slug: `title-page-post-${i}`,
    }));
    await seedPosts(posts);
    await page.goto("/news?page=2");
    await expect(page).toHaveTitle("News — Page 2");
  });

  test("the header's News link is marked current on the list and on a detail page", async ({
    page,
  }) => {
    await seedPosts([{ title: "Nav Current Post", slug: "nav-current-post" }]);

    await page.goto("/news");
    await expect(page.getByRole("link", { name: "News", exact: true }).first()).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.goto("/news/nav-current-post");
    await expect(page.getByRole("link", { name: "News", exact: true }).first()).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

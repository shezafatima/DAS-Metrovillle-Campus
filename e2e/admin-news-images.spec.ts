import path from "node:path";
import { test, expect } from "@playwright/test";
import { loginAsAdmin, seedPosts, clearPosts } from "./helpers/news";

const FIXTURE = path.join(__dirname, "fixtures", "cover.jpg");

async function stubCloudinaryUpload(page: import("@playwright/test").Page) {
  await page.route("https://api.cloudinary.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: "https://res.cloudinary.com/test/image/upload/v1/news/covers/e2e.jpg",
        public_id: "news/covers/e2e",
        width: 4000,
        height: 3000,
      }),
    });
  });
}

test.describe("admin news cover images (US4)", () => {
  test.beforeEach(async ({ page }) => {
    await clearPosts();
    await loginAsAdmin(page);
    await stubCloudinaryUpload(page);
  });

  test("uploads a cover image, requires alt text, and shows it on the card and detail page", async ({
    page,
  }) => {
    await page.goto("/admin/news/new");
    await page.getByLabel("Title").fill("Image Upload Post");
    await page.getByLabel("Category").selectOption("events");
    await page.locator(".prose-news").fill("A post with a cover image.");

    await page.getByRole("button", { name: "Choose image" }).click();
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    await expect(page.getByRole("img").first()).toBeVisible();

    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Alternative text is required.")).toBeVisible();

    await page.getByLabel("Alternative text").fill("A descriptive caption");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Saved as draft.")).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published.")).toBeVisible();

    await page.goto("/admin/news");
    await expect(page.locator("table img").first()).toHaveAttribute("src", /w_160/);

    await page.goto("/news");
    await expect(page.locator("article img").first()).toHaveAttribute("src", /c_limit/);

    await page.goto("/news/image-upload-post");
    await expect(page.getByRole("img", { name: "A descriptive caption" })).toBeVisible();
  });

  test("rejects an oversized image without losing entered text", async ({ page }) => {
    await page.goto("/admin/news/new");
    await page.getByLabel("Title").fill("Oversized Image Post");

    const oversized = {
      name: "big.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(6 * 1024 * 1024, 1),
    };
    await page.getByRole("button", { name: "Choose image" }).click();
    await page.locator('input[type="file"]').setInputFiles(oversized);

    await expect(page.getByText("Image must be 5 MB or smaller.")).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Oversized Image Post");
  });

  test("a failed upload leaves the title and body intact", async ({ page }) => {
    await page.route("https://api.cloudinary.com/**", (route) =>
      route.fulfill({ status: 500, body: "server error" }),
    );

    await page.goto("/admin/news/new");
    await page.getByLabel("Title").fill("Failed Upload Post");
    await page.locator(".prose-news").fill("Body text that must survive the failure.");

    await page.getByRole("button", { name: "Choose image" }).click();
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    await expect(page.getByText("The image could not be uploaded. Please try again.")).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Failed Upload Post");
  });

  test("removing a cover image shows the placeholder everywhere", async ({ page }) => {
    const [seeded] = await seedPosts([
      {
        title: "Remove Cover Post",
        slug: "remove-cover-post",
        status: "published",
        coverImage: {
          url: "https://res.cloudinary.com/test/image/upload/v1/news/covers/existing.jpg",
          publicId: "news/covers/existing",
          width: 1200,
          height: 630,
          alt: "Existing cover",
        },
      },
    ]);

    await page.goto(`/admin/news/${seeded._id.toString()}`);
    await page.getByRole("button", { name: "Remove image" }).click();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Saved as draft.")).toBeVisible();

    await page.goto("/news/remove-cover-post");
    await expect(page.locator("article img, main img")).toHaveCount(0);
  });
});

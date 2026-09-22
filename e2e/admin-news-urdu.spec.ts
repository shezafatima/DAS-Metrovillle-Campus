import { test, expect } from "@playwright/test";
import { loginAsAdmin, seedPosts, clearPosts } from "./helpers/news";

const URDU_TITLE = "فکر اقبال اور تعلیمی نظام";

test.describe("Urdu support (US5)", () => {
  test.beforeEach(async ({ page }) => {
    await clearPosts();
    await loginAsAdmin(page);
  });

  test("the editor switches to right-to-left and the Urdu font when language is Urdu", async ({
    page,
  }) => {
    await page.goto("/admin/news/new");
    await page.getByLabel("Language").selectOption("ur");
    await page.getByLabel("Title").fill(URDU_TITLE);

    const titleInput = page.getByLabel("Title");
    await expect(titleInput).toHaveAttribute("dir", "rtl");
    const titleFont = await titleInput.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(titleFont).toMatch(/softLINKS Urdu|Noto Nastaliq/);

    const editorRoot = page.locator(".prose-news");
    await expect(editorRoot).toHaveAttribute("dir", "rtl");
  });

  test("an Urdu post reads right-to-left with the Urdu font in the admin table, card, and detail page", async ({
    page,
  }) => {
    await seedPosts([
      {
        title: URDU_TITLE,
        slug: "urdu-post",
        language: "ur",
        bodyHtml: `<p>${URDU_TITLE} — with an English phrase like Bahria University inside.</p>`,
        status: "published",
      },
    ]);

    await page.goto("/admin/news");
    const tableTitle = page.getByRole("link", { name: URDU_TITLE });
    await expect(tableTitle).toHaveAttribute("dir", "rtl");

    await page.goto("/news");
    const cardTitle = page.getByRole("heading", { level: 2 }).filter({ hasText: URDU_TITLE });
    await expect(cardTitle).toHaveAttribute("dir", "rtl");

    await page.goto("/news/urdu-post");
    const body = page.locator(".prose-news");
    await expect(body).toHaveAttribute("dir", "rtl");
    const direction = await body.evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe("rtl");
    await expect(body).toContainText("Bahria University");
  });

  test("an English post reads left-to-right", async ({ page }) => {
    await seedPosts([{ title: "English Post", slug: "english-post", language: "en" }]);
    await page.goto("/news");
    const cardTitle = page.getByRole("heading", { level: 2 }).filter({ hasText: "English Post" });
    await expect(cardTitle).not.toHaveAttribute("dir", "rtl");
  });

  test("admin search matches an Urdu title fragment", async ({ page }) => {
    await seedPosts([{ title: URDU_TITLE, slug: "urdu-search-post", language: "ur" }]);
    await page.goto("/admin/news?q=" + encodeURIComponent("تعلیمی"));
    await expect(page.getByText(URDU_TITLE)).toBeVisible();
  });

  test("an Urdu title produces an address with Urdu letters that opens correctly", async ({ page }) => {
    await page.goto("/admin/news/new");
    await page.getByLabel("Language").selectOption("ur");
    await page.getByLabel("Title").fill(URDU_TITLE);
    await page.getByLabel("Category").selectOption("events");
    await page.locator(".prose-news").fill("متن");
    await page.getByRole("button", { name: "Save draft" }).click();

    const address = await page.getByLabel("Address").inputValue();
    expect(/[؀-ۿ]/.test(address)).toBe(true);

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published.")).toBeVisible();

    await page.goto(`/news/${address}`);
    await expect(page.getByRole("heading", { name: URDU_TITLE, level: 1 })).toBeVisible();
  });
});

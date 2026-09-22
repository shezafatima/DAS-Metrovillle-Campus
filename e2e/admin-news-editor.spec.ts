import { test, expect } from "@playwright/test";
import { loginAsAdmin, seedPosts, clearPosts } from "./helpers/news";

test.describe("admin news editor (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await clearPosts();
    await loginAsAdmin(page);
  });

  test("title auto-fills the address, which stops auto-filling once edited by hand", async ({
    page,
  }) => {
    await page.goto("/admin/news/new");
    await page.getByLabel("Title").fill("Annual Sports Day 2026");
    await expect(page.getByLabel("Address")).toHaveValue("annual-sports-day-2026");

    await page.getByLabel("Address").fill("custom-address");
    await page.getByLabel("Title").fill("Annual Sports Day 2026 Updated");
    await expect(page.getByLabel("Address")).toHaveValue("custom-address");
  });

  test("rejects an empty body with a clear message and keeps the title", async ({ page }) => {
    await page.goto("/admin/news/new");
    await page.getByLabel("Title").fill("Empty Body Post");
    await page.getByLabel("Category").selectOption("events");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page.getByText("Body is required.")).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Empty Body Post");
  });

  test("saves a draft, then publishes and unpublishes it", async ({ page }) => {
    await page.goto("/admin/news/new");
    await page.getByLabel("Title").fill("Sports Day Draft");
    await page.getByLabel("Category").selectOption("events");
    await page.locator(".prose-news").fill("A day of sports and fun for everyone.");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page).toHaveURL(/\/admin\/news\/[a-f0-9]+$/);
    await expect(page.getByText("Saved as draft.")).toBeVisible();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published.")).toBeVisible();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Unpublished")).toBeVisible();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  });

  test("editing the title keeps the existing address", async ({ page }) => {
    const [seeded] = await seedPosts([
      { title: "Sports Day", slug: "sports-day", status: "draft" },
    ]);
    await page.goto(`/admin/news/${seeded._id.toString()}`);
    await page.getByLabel("Title").fill("Sports Day (updated)");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page.getByText("Saved as draft.")).toBeVisible();
    await expect(page.getByLabel("Address")).toHaveValue("sports-day");
  });

  test("saving with an address already used by another post shows a field error and keeps other input", async ({
    page,
  }) => {
    await seedPosts([{ title: "Existing Post", slug: "existing-post", status: "published" }]);
    await page.goto("/admin/news/new");
    await page.getByLabel("Title").fill("New Post With Conflict");
    await page.getByLabel("Address").fill("existing-post");
    await page.getByLabel("Category").selectOption("events");
    await page.locator(".prose-news").fill("Body text that should survive the failed save.");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page.getByText("This address is already in use.")).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("New Post With Conflict");
  });

  test("leaving the editor with unsaved changes prompts a confirmation", async ({ page }) => {
    await page.goto("/admin/news/new");
    await page.getByLabel("Title").fill("Unsaved Changes Post");

    let dialogSeen = false;
    page.once("dialog", async (dialog) => {
      dialogSeen = true;
      await dialog.dismiss();
    });
    await page.getByRole("link", { name: "Overview" }).click();

    await expect.poll(() => dialogSeen).toBe(true);
    await expect(page).toHaveURL(/\/admin\/news\/new$/);
  });
});

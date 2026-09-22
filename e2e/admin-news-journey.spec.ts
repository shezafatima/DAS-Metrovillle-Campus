import { test, expect } from "@playwright/test";
import { loginAsAdmin, clearPosts } from "./helpers/news";

/**
 * The spec's Acceptance journey end to end through the real UI (not
 * seeded fixtures): create a draft, publish it, see it on the public
 * list and detail page, unpublish it, confirm it disappears, delete
 * it, confirm the address returns not found (spec.md "Acceptance").
 */
test.describe("news end-to-end journey (US1-US3 Acceptance)", () => {
  test.beforeEach(async ({ page }) => {
    await clearPosts();
    await loginAsAdmin(page);
  });

  test("draft -> publish -> visible -> unpublish -> gone -> delete -> not found", async ({ page }) => {
    await page.goto("/admin/news/new");
    await page.getByLabel("Title").fill("Journey Test Post");
    await page.getByLabel("Category").selectOption("events");
    await page.locator(".prose-news").fill("This post walks through the full news journey.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/admin\/news\/[a-f0-9]+$/);

    const editUrl = page.url();
    const postId = editUrl.split("/").pop()!;

    // Draft is not visible publicly yet.
    await page.goto("/news");
    await expect(page.getByText("Journey Test Post")).toHaveCount(0);
    const draftDetail = await page.goto("/news/journey-test-post");
    expect(draftDetail?.status()).toBe(404);

    // Publish -> visible on the list and its own detail page.
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published.")).toBeVisible();

    await page.goto("/news");
    await expect(page.getByText("Journey Test Post")).toBeVisible();
    await page.goto("/news/journey-test-post");
    await expect(page.getByRole("heading", { name: "Journey Test Post", level: 1 })).toBeVisible();

    // Unpublish -> gone from the public site again.
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Unpublished")).toBeVisible();

    await page.goto("/news");
    await expect(page.getByText("Journey Test Post")).toHaveCount(0);
    const unpublishedDetail = await page.goto("/news/journey-test-post");
    expect(unpublishedDetail?.status()).toBe(404);

    // Delete -> gone from the admin list too.
    await page.goto("/admin/news");
    await page.getByRole("button", { name: /Delete: Journey Test Post/ }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Journey Test Post")).toHaveCount(0);

    const deletedDetail = await page.goto("/news/journey-test-post");
    expect(deletedDetail?.status()).toBe(404);

    const deletedEdit = await page.goto(`/admin/news/${postId}`);
    expect(deletedEdit?.status()).toBe(404);
  });
});

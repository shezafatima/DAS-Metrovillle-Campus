// @vitest-environment node
import { it, expect } from "vitest";
import { describeWithDb } from "@/test/db";
import { NewsPost } from "@/models/news-post";
import { listAdminPosts, getAdminPost, countPublishedPosts } from "./admin-queries";

async function seed(overrides: Record<string, unknown> = {}) {
  return NewsPost.create({
    title: "Post",
    slug: `post-${Math.random().toString(36).slice(2)}`,
    bodyHtml: "<p>Body</p>",
    excerpt: "Body",
    language: "en",
    category: "events",
    status: "published",
    publishDate: new Date(),
    ...overrides,
  });
}

describeWithDb("listAdminPosts", ["news"], () => {
  it("paginates 25 posts into 20 + 5 across two pages, newest first", async () => {
    for (let i = 0; i < 25; i++) {
      await seed({
        title: `Post ${i}`,
        slug: `post-${i}`,
        publishDate: new Date(Date.UTC(2026, 0, i + 1)),
      });
    }
    const page1 = await listAdminPosts({ page: 1 });
    expect(page1.items).toHaveLength(20);
    expect(page1.totalPages).toBe(2);
    expect(page1.items[0].title).toBe("Post 24");

    const page2 = await listAdminPosts({ page: 2 });
    expect(page2.items).toHaveLength(5);
  });

  it("matches an Urdu title fragment case-insensitively", async () => {
    await seed({ title: "فکر اقبال اور تعلیمی نظام", slug: "urdu-post" });
    await seed({ title: "Sports Day", slug: "sports-day" });
    const result = await listAdminPosts({ q: "تعلیمی" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].slug).toBe("urdu-post");
  });

  it("matches an English title fragment case-insensitively", async () => {
    await seed({ title: "Sports Day", slug: "sports-day" });
    const result = await listAdminPosts({ q: "SPORTS" });
    expect(result.items).toHaveLength(1);
  });

  it("does not throw on regex metacharacters in the search text", async () => {
    await seed({ title: "a+b test", slug: "a-plus-b" });
    await expect(listAdminPosts({ q: "a+b" })).resolves.not.toThrow();
  });

  it("filters by status", async () => {
    await seed({ title: "Draft One", slug: "draft-one", status: "draft" });
    await seed({ title: "Published One", slug: "published-one", status: "published" });
    const drafts = await listAdminPosts({ status: "draft" });
    expect(drafts.items.every((i) => i.status === "draft")).toBe(true);
    expect(drafts.items.some((i) => i.slug === "published-one")).toBe(false);
  });

  it("never returns a soft-deleted post", async () => {
    const doc = await seed({ title: "To Delete", slug: "to-delete" });
    await NewsPost.softDeleteById(doc._id);
    const result = await listAdminPosts({});
    expect(result.items.some((i) => i.slug === "to-delete")).toBe(false);
  });

  it("marks a future-dated published post as scheduled", async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 3);
    await seed({ title: "Future Post", slug: "future-post", publishDate: future, status: "published" });
    const result = await listAdminPosts({ q: "Future Post" });
    expect(result.items[0].isScheduled).toBe(true);
  });
});

describeWithDb("getAdminPost", ["news"], () => {
  it("returns null for an id that isn't a valid ObjectId", async () => {
    expect(await getAdminPost("not-an-id")).toBeNull();
  });

  it("returns null for a soft-deleted post", async () => {
    const doc = await seed({ title: "Deleted", slug: "deleted-for-get" });
    await NewsPost.softDeleteById(doc._id);
    expect(await getAdminPost(doc._id.toString())).toBeNull();
  });
});

describeWithDb("countPublishedPosts", ["news"], () => {
  it("counts only published posts, ignoring drafts and soft-deleted ones", async () => {
    await seed({ title: "Published A", slug: "count-published-a", status: "published" });
    await seed({ title: "Published B", slug: "count-published-b", status: "published" });
    await seed({ title: "Draft", slug: "count-draft", status: "draft" });
    const deleted = await seed({
      title: "Deleted Published",
      slug: "count-deleted-published",
      status: "published",
    });
    await NewsPost.softDeleteById(deleted._id);

    expect(await countPublishedPosts()).toBe(2);
  });

  it("counts a future-dated published post immediately, without waiting for its publish date", async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 5);
    await seed({ title: "Future Published", slug: "count-future-published", status: "published", publishDate: future });
    expect(await countPublishedPosts()).toBe(1);
  });
});

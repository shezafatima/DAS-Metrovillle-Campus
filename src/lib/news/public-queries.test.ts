// @vitest-environment node
import { it, expect } from "vitest";
import { describeWithDb } from "@/test/db";
import { NewsPost } from "@/models/news-post";
import { listPublishedPosts, getPublishedPostBySlug } from "./public-queries";

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function seedMatrix() {
  const published = await NewsPost.create({
    title: "Published Today",
    slug: "published-today",
    bodyHtml: "<p>Body</p>",
    excerpt: "Body",
    language: "en",
    category: "events",
    status: "published",
    publishDate: daysFromNow(0),
  });
  const yesterday = await NewsPost.create({
    title: "Published Yesterday",
    slug: "published-yesterday",
    bodyHtml: "<p>Body</p>",
    excerpt: "Body",
    language: "en",
    category: "events",
    status: "published",
    publishDate: daysFromNow(-1),
  });
  const draft = await NewsPost.create({
    title: "Still A Draft",
    slug: "still-a-draft",
    bodyHtml: "<p>Body</p>",
    excerpt: "Body",
    language: "en",
    category: "events",
    status: "draft",
    publishDate: daysFromNow(0),
  });
  const future = await NewsPost.create({
    title: "Published Tomorrow",
    slug: "published-tomorrow",
    bodyHtml: "<p>Body</p>",
    excerpt: "Body",
    language: "en",
    category: "events",
    status: "published",
    publishDate: daysFromNow(1),
  });
  const deletedDoc = await NewsPost.create({
    title: "Deleted Post",
    slug: "deleted-post",
    bodyHtml: "<p>Body</p>",
    excerpt: "Body",
    language: "en",
    category: "events",
    status: "published",
    publishDate: daysFromNow(0),
  });
  await NewsPost.softDeleteById(deletedDoc._id);
  const categorised = await NewsPost.create({
    title: "Events Category Post",
    slug: "events-category-post",
    bodyHtml: "<p>Body</p>",
    excerpt: "Body",
    language: "en",
    category: "events",
    status: "published",
    publishDate: daysFromNow(-2),
  });
  return { published, yesterday, draft, future, deletedDoc, categorised };
}

describeWithDb("public-queries visibility", ["news"], () => {
  it("lists only published, current, non-deleted posts, newest first", async () => {
    await seedMatrix();
    const result = await listPublishedPosts({});
    const slugs = result.items.map((i) => i.slug);
    expect(slugs).toEqual([
      "published-today",
      "published-yesterday",
      "events-category-post",
    ]);
    expect(slugs).not.toContain("still-a-draft");
    expect(slugs).not.toContain("published-tomorrow");
    expect(slugs).not.toContain("deleted-post");
  });

  it("never returns a draft, future-dated, or deleted post by slug", async () => {
    await seedMatrix();
    expect(await getPublishedPostBySlug("still-a-draft")).toBeNull();
    expect(await getPublishedPostBySlug("published-tomorrow")).toBeNull();
    expect(await getPublishedPostBySlug("deleted-post")).toBeNull();
  });

  it("returns the full DTO for a visible post with no internal fields", async () => {
    await seedMatrix();
    const post = await getPublishedPostBySlug("published-today");
    expect(post).not.toBeNull();
    expect(post).not.toHaveProperty("_id");
    expect(post).not.toHaveProperty("deletedAt");
    expect(post?.bodyHtml).toBe("<p>Body</p>");
  });

  it("paginates 10 visible posts into 9 + 1", async () => {
    for (let i = 0; i < 10; i++) {
      await NewsPost.create({
        title: `Post ${i}`,
        slug: `pagination-post-${i}`,
        bodyHtml: "<p>Body</p>",
        excerpt: "Body",
        language: "en",
        category: "events",
        status: "published",
        publishDate: daysFromNow(-i),
      });
    }
    const page1 = await listPublishedPosts({ page: 1 });
    expect(page1.items).toHaveLength(9);
    const page2 = await listPublishedPosts({ page: 2 });
    expect(page2.items).toHaveLength(1);
  });

  it("filters by category", async () => {
    await seedMatrix();
    await NewsPost.create({
      title: "Head Office Post",
      slug: "head-office-post",
      bodyHtml: "<p>Body</p>",
      excerpt: "Body",
      language: "en",
      category: "head-office",
      status: "published",
      publishDate: daysFromNow(0),
    });
    const result = await listPublishedPosts({ category: "events" });
    expect(result.items.every((i) => i.category === "events")).toBe(true);
    expect(result.items.some((i) => i.slug === "head-office-post")).toBe(false);
  });
});

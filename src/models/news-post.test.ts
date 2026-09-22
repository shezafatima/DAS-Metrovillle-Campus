// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { describeWithDb } from "@/test/db";
import { connectDb } from "@/lib/db";
import { NewsPost } from "./news-post";

function samplePost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Sample Post",
    slug: "sample-post",
    bodyHtml: "<p>Body</p>",
    excerpt: "Body",
    language: "en",
    category: "events",
    status: "draft",
    publishDate: new Date("2026-09-21"),
    ...overrides,
  };
}

describeWithDb("NewsPost model", ["news"], () => {
  beforeAll(async () => {
    // beforeAll runs before describeWithDb's own beforeEach gets a chance
    // to connect (Vitest always runs beforeAll before the first
    // beforeEach) — connect explicitly here too, or syncIndexes() hits
    // Mongoose's connection-buffering timeout on a cold run.
    await connectDb();
    await NewsPost.syncIndexes();
  });

  it("enforces a unique slug", async () => {
    await NewsPost.create(samplePost({ slug: "duplicate-slug" }));
    await expect(
      NewsPost.create(samplePost({ slug: "duplicate-slug", title: "Second" })),
    ).rejects.toThrow();
  });

  it("keeps a soft-deleted post's slug reserved", async () => {
    const doc = await NewsPost.create(samplePost({ slug: "deleted-slug" }));
    await NewsPost.softDeleteById(doc._id);
    await expect(
      NewsPost.create(samplePost({ slug: "deleted-slug", title: "Reused" })),
    ).rejects.toThrow();
  });

  it("excludes a soft-deleted post from find() by default", async () => {
    const doc = await NewsPost.create(samplePost({ slug: "hide-me" }));
    await NewsPost.softDeleteById(doc._id);
    expect(await NewsPost.findOne({ _id: doc._id })).toBeNull();
  });

  it("includes a soft-deleted post when withDeleted is set", async () => {
    const doc = await NewsPost.create(samplePost({ slug: "show-me-deleted" }));
    await NewsPost.softDeleteById(doc._id);
    const found = await NewsPost.findOne({ _id: doc._id }).setOptions({ withDeleted: true });
    expect(found).not.toBeNull();
    expect(found!.deletedAt).not.toBeNull();
  });
});

describe("NewsPost schema shape", () => {
  it("has the expected default values on the schema paths", () => {
    const languagePath = NewsPost.schema.path("language") as unknown as { defaultValue: unknown };
    const statusPath = NewsPost.schema.path("status") as unknown as { defaultValue: unknown };
    expect(languagePath.defaultValue).toBe("en");
    expect(statusPath.defaultValue).toBe("draft");
  });
});

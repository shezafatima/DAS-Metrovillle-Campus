// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { NewsPost } from "@/models/news-post";
import { listLatestPosts } from "./public-queries";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function post(slug: string, o: Record<string, unknown> = {}) {
  return { title: slug, slug, bodyHtml: "<p>Body</p>", excerpt: "Body", language: "en", category: "events", status: "published", publishDate: daysFromNow(0), ...o };
}

describeWithDb("listLatestPosts (006 Latest News)", ["news"], () => {
  it("returns only visible posts, newest first, at most the limit", async () => {
    for (let i = 1; i <= 8; i += 1) await NewsPost.create(post(`old-${i}`, { publishDate: daysFromNow(-i) }));
    await NewsPost.create(post("today"));
    await NewsPost.create(post("a-draft", { status: "draft" }));
    await NewsPost.create(post("tomorrow", { publishDate: daysFromNow(1) }));
    const gone = await NewsPost.create(post("gone"));
    await NewsPost.updateOne({ _id: gone._id }, { $set: { deletedAt: new Date() } });

    const latest = await listLatestPosts(6);
    expect(latest.map((p) => p.slug)).toEqual(["today", "old-1", "old-2", "old-3", "old-4", "old-5"]);
  });

  it("returns an empty list when nothing is published", async () => {
    await NewsPost.create(post("draft-only", { status: "draft" }));
    expect(await listLatestPosts(6)).toEqual([]);
  });
});

describe("getLatestPosts never throws (FR-016)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("a failed read gives an empty list and a log line", async () => {
    vi.doMock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
    vi.doMock("./public-queries", () => ({ listLatestPosts: () => Promise.reject(new Error("db down")) }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getLatestPosts } = await import("./latest");
    expect(await getLatestPosts()).toEqual([]);
    expect(warn.mock.calls.some(([line]) => String(line).includes("latest_news_read_failed"))).toBe(true);
    warn.mockRestore();
  });

  it("revalidateNewsCaches is safe outside a Next request", async () => {
    vi.doMock("next/cache", () => ({
      unstable_cache: (fn: () => unknown) => fn,
      revalidateTag: () => {
        throw new Error("no request store");
      },
      revalidatePath: vi.fn(),
    }));
    const { revalidateNewsCaches } = await import("./latest");
    expect(() => revalidateNewsCaches()).not.toThrow();
  });
});

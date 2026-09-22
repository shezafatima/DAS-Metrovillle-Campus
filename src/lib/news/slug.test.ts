import { describe, expect, it } from "vitest";
import { decodeSlugParam, fallbackSlug, isReservedSlug, slugify, SLUG_PATTERN } from "./slug";

describe("slugify", () => {
  it("converts a simple English title", () => {
    expect(slugify("Annual Sports Day 2026")).toBe("annual-sports-day-2026");
  });

  it("keeps Urdu letters", () => {
    const slug = slugify("فکر اقبال اور تعلیمی نظام");
    expect(slug).toBe("فکر-اقبال-اور-تعلیمی-نظام");
    expect(SLUG_PATTERN.test(slug)).toBe(true);
  });

  it("collapses punctuation and spaces into single hyphens", () => {
    expect(slugify("Hello,   World!!  --  Test")).toBe("hello-world-test");
  });

  it("caps a very long title at 120 characters without a trailing hyphen", () => {
    const longTitle = "word ".repeat(60).trim(); // 300 chars
    const slug = slugify(longTitle);
    expect(slug.length).toBeLessThanOrEqual(120);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns an empty string for a title with nothing usable", () => {
    expect(slugify("🎉🎊✨")).toBe("");
  });
});

describe("fallbackSlug", () => {
  it("matches the post-<yyyymmdd>-<4 base36 chars> shape", () => {
    expect(fallbackSlug()).toMatch(/^post-\d{8}-[a-z0-9]{4}$/);
  });

  it("uses the given date", () => {
    const date = new Date(Date.UTC(2026, 8, 21)); // 2026-09-21
    expect(fallbackSlug(date)).toMatch(/^post-20260921-[a-z0-9]{4}$/);
  });
});

describe("decodeSlugParam", () => {
  it("decodes a percent-encoded Urdu slug (this Next.js version does not decode [slug] route params automatically)", () => {
    const encoded =
      "%D8%B3%D8%A7%D9%84%D8%A7%D9%86%DB%81-%DB%8C%D9%88%D9%85-%DA%A9%DA%BE%DB%8C%D9%84-2026";
    expect(decodeSlugParam(encoded)).toBe("سالانہ-یوم-کھیل-2026");
  });

  it("round-trips a slug produced by slugify() through encode -> decode", () => {
    const slug = slugify("سالانہ یومِ کھیل 2026");
    expect(decodeSlugParam(encodeURIComponent(slug))).toBe(slug);
  });

  it("is a no-op for a plain ASCII slug", () => {
    expect(decodeSlugParam("annual-sports-day-2026")).toBe("annual-sports-day-2026");
  });

  it("falls back to the raw value on a malformed percent-sequence instead of throwing", () => {
    expect(decodeSlugParam("100%-off")).toBe("100%-off");
  });
});

describe("isReservedSlug", () => {
  it("treats category keys as reserved", () => {
    expect(isReservedSlug("events")).toBe(true);
    expect(isReservedSlug("head-office")).toBe(true);
  });

  it("treats 'page' as reserved", () => {
    expect(isReservedSlug("page")).toBe(true);
  });

  it("does not treat a similar-but-different slug as reserved", () => {
    expect(isReservedSlug("events-2026")).toBe(false);
  });
});

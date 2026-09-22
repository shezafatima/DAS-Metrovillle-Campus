import { describe, expect, it } from "vitest";
import { fieldErrors, newsPostInputSchema } from "./news";

const VALID_INPUT = {
  title: "Annual Sports Day",
  bodyHtml: "<p>Some body text.</p>",
  category: "events" as const,
  publishDate: "2026-09-21",
};

describe("newsPostInputSchema", () => {
  it("parses valid input and applies defaults", () => {
    const result = newsPostInputSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("en");
      expect(result.data.status).toBe("draft");
      expect(result.data.coverImage).toBeNull();
    }
  });

  it("rejects an empty title", () => {
    const result = newsPostInputSchema.safeParse({ ...VALID_INPUT, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).title).toBeDefined();
  });

  it("rejects a 201-character title", () => {
    const result = newsPostInputSchema.safeParse({ ...VALID_INPUT, title: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects a reserved slug", () => {
    const result = newsPostInputSchema.safeParse({ ...VALID_INPUT, slug: "events" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).slug).toBe("This address is reserved.");
    }
  });

  it("rejects a slug with spaces or uppercase", () => {
    const result = newsPostInputSchema.safeParse({ ...VALID_INPUT, slug: "Bad Slug" });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed slug", () => {
    const result = newsPostInputSchema.safeParse({ ...VALID_INPUT, slug: "sports-day-2026" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid calendar date", () => {
    const result = newsPostInputSchema.safeParse({ ...VALID_INPUT, publishDate: "2026-02-30" });
    expect(result.success).toBe(false);
  });

  it("rejects a cover image with empty alt text", () => {
    const result = newsPostInputSchema.safeParse({
      ...VALID_INPUT,
      coverImage: {
        url: "https://res.cloudinary.com/demo/image/upload/v1/news/covers/x.jpg",
        publicId: "news/covers/x",
        width: 100,
        height: 100,
        alt: "",
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)["coverImage.alt"]).toBeDefined();
    }
  });

  it("rejects a cover image whose publicId is outside news/covers/", () => {
    const result = newsPostInputSchema.safeParse({
      ...VALID_INPUT,
      coverImage: {
        url: "https://res.cloudinary.com/demo/image/upload/v1/other/x.jpg",
        publicId: "other/x",
        width: 100,
        height: 100,
        alt: "A photo.",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = newsPostInputSchema.safeParse({ ...VALID_INPUT, category: "sports" });
    expect(result.success).toBe(false);
  });
});

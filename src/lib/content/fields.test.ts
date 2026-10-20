import { describe, expect, it } from "vitest";
import { imageRef, itemId, longText, text, uniqueIds } from "./fields";

describe("text", () => {
  it("trims and enforces 1..max", () => {
    expect(text(10).parse("  hi  ")).toBe("hi");
    expect(text(10).safeParse("").success).toBe(false);
    expect(text(10).safeParse("a".repeat(11)).success).toBe(false);
  });
});

describe("longText", () => {
  it("accepts paragraphs separated by one blank line", () => {
    expect(longText(100).safeParse("a\n\nb").success).toBe(true);
  });
  it("rejects leading/trailing whitespace and 3+ newlines in a row", () => {
    expect(longText(100).safeParse(" a").success).toBe(false);
    expect(longText(100).safeParse("a ").success).toBe(false);
    expect(longText(100).safeParse("a\n\n\nb").success).toBe(false);
  });
});

describe("imageRef", () => {
  it("accepts local paths and Cloudinary URLs", () => {
    expect(imageRef.safeParse({ url: "/images/x.svg", publicId: "", width: 1, height: 1 }).success).toBe(true);
    expect(
      imageRef.safeParse({ url: "https://res.cloudinary.com/demo/image/upload/x.jpg", publicId: "x", width: 10, height: 10 }).success,
    ).toBe(true);
  });
});

describe("itemId", () => {
  it("accepts kebab-case and rejects other forms", () => {
    expect(itemId.safeParse("school-leadership").success).toBe(true);
    expect(itemId.safeParse("School_Leadership").success).toBe(false);
  });
});

describe("uniqueIds", () => {
  it("is false for duplicate ids", () => {
    expect(uniqueIds([{ id: "a" }, { id: "b" }])).toBe(true);
    expect(uniqueIds([{ id: "a" }, { id: "a" }])).toBe(false);
  });
});

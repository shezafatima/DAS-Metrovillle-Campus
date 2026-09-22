import { describe, expect, it } from "vitest";
import { excerptFrom } from "./excerpt";

describe("excerptFrom", () => {
  it("returns short text unchanged", () => {
    expect(excerptFrom("A short sentence.")).toBe("A short sentence.");
  });

  it("cuts long text at a word boundary and appends an ellipsis", () => {
    const text = "word ".repeat(50).trim(); // 249 chars
    const result = excerptFrom(text, 160);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(161);
    expect(result.slice(0, -1).endsWith(" ")).toBe(false); // no mid-word cut
  });

  it("never cuts mid-word", () => {
    const text = "supercalifragilisticexpialidocious ".repeat(10).trim();
    const result = excerptFrom(text, 40);
    const withoutEllipsis = result.slice(0, -1);
    // The cut portion must be a prefix made only of whole words from the source.
    expect(text.startsWith(withoutEllipsis)).toBe(true);
    expect(text[withoutEllipsis.length]).toMatch(/^( |$)/);
  });

  it("respects spaces in Urdu text", () => {
    const text = "فکر اقبال اور تعلیمی نظام ".repeat(10).trim();
    const result = excerptFrom(text, 40);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(41);
  });

  it("uses the default max of 160", () => {
    const text = "x".repeat(161);
    expect(excerptFrom(text)).toHaveLength(161); // 160 chars cut mid-word (no spaces) + ellipsis
  });
});

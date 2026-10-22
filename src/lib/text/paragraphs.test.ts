import { describe, expect, it } from "vitest";
import { toParagraphs } from "./paragraphs";

describe("toParagraphs", () => {
  it("splits on one or more blank lines", () => {
    expect(toParagraphs("First.\n\nSecond.\n\n\n\nThird.")).toEqual(["First.", "Second.", "Third."]);
  });

  it("treats a line with only spaces as a blank line", () => {
    expect(toParagraphs("First.\n   \nSecond.")).toEqual(["First.", "Second."]);
  });

  it("folds single newlines inside a paragraph into a space", () => {
    expect(toParagraphs("One line\nstill the same paragraph.\n\nNext.")).toEqual(["One line still the same paragraph.", "Next."]);
  });

  it("trims each paragraph and drops empty ones", () => {
    expect(toParagraphs("\n\n  Padded.  \n\n\n")).toEqual(["Padded."]);
  });

  it("handles Windows line endings", () => {
    expect(toParagraphs("A\r\n\r\nB\r\nC")).toEqual(["A", "B C"]);
  });

  it("returns an empty list for empty or whitespace-only text", () => {
    expect(toParagraphs("")).toEqual([]);
    expect(toParagraphs("  \n \n ")).toEqual([]);
  });

  it("never interprets markup: it is returned as plain text", () => {
    expect(toParagraphs("<b>x</b>\n\n<script>alert(1)</script>")).toEqual(["<b>x</b>", "<script>alert(1)</script>"]);
  });
});

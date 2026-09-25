import { describe, expect, it } from "vitest";
import { toPreview } from "@/lib/messages/preview";

describe("toPreview", () => {
  it("leaves short text unchanged", () => {
    expect(toPreview("hello")).toBe("hello");
  });

  it("collapses whitespace runs including newlines", () => {
    expect(toPreview("a\n\nb")).toBe("a b");
  });

  it("truncates long text at the code-point limit with an ellipsis", () => {
    const input = "x".repeat(150);
    expect(toPreview(input)).toBe(`${"x".repeat(100)}…`);
  });

  it("never splits an emoji at the cut point", () => {
    const input = `${"a".repeat(100)}😀${"b".repeat(50)}`;
    const result = toPreview(input);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("�");
    expect(Array.from(result.slice(0, -1))).toHaveLength(100);
  });

  it("cuts a 120-character Urdu string to 100 code points plus an ellipsis", () => {
    const input = "علی".repeat(40); // 120 code points
    const result = toPreview(input);
    expect(Array.from(result.slice(0, -1))).toHaveLength(100);
    expect(result.endsWith("…")).toBe(true);
  });
});

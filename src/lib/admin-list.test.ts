import { describe, expect, it } from "vitest";
import { escapeRegExp } from "./admin-list";

describe("escapeRegExp", () => {
  it("escapes every regex metacharacter", () => {
    expect(escapeRegExp(".*+?^${}()|[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("lets plain text and Urdu text through unchanged", () => {
    expect(escapeRegExp("khan")).toBe("khan");
    expect(escapeRegExp("علی خان")).toBe("علی خان");
  });

  it("produces a pattern that still matches the original literal text", () => {
    const value = "a.b*c";
    const re = new RegExp(escapeRegExp(value));
    expect(re.test("a.b*c")).toBe(true);
    expect(re.test("axbxc")).toBe(false);
  });
});

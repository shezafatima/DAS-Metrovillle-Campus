import { describe, expect, it } from "vitest";
import { searchSite, type SearchResult } from "./site-search";

const fixtureIndex: SearchResult[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Overview", href: "/about/overview", parentLabel: "About" },
  { label: "Admission", href: "/admission" },
];

describe("searchSite", () => {
  it("matches labels case-insensitively", () => {
    expect(searchSite("about", fixtureIndex).map((r) => r.href)).toEqual([
      "/about",
    ]);
    expect(searchSite("ABOUT", fixtureIndex).map((r) => r.href)).toEqual([
      "/about",
    ]);
  });

  it("matches a substring anywhere in the label", () => {
    expect(searchSite("view", fixtureIndex).map((r) => r.href)).toEqual([
      "/about/overview",
    ]);
  });

  it("returns an empty array for a blank query", () => {
    expect(searchSite("", fixtureIndex)).toEqual([]);
    expect(searchSite("   ", fixtureIndex)).toEqual([]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchSite("xyz-nonexistent", fixtureIndex)).toEqual([]);
  });

  it("includes the parent label for a sub-page result", () => {
    const [result] = searchSite("overview", fixtureIndex);
    expect(result.parentLabel).toBe("About");
  });
});

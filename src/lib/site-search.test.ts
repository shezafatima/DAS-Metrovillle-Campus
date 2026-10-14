import { describe, expect, it } from "vitest";
import { searchIndex, searchSite, type SearchResult } from "./site-search";

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

describe("the real search index (012 careers)", () => {
  it("finds the Careers page, once, as a main menu item", () => {
    expect(searchSite("career", searchIndex)).toEqual([{ label: "Careers", href: "/careers", parentLabel: undefined }]);
    expect(searchSite("CAREERS", searchIndex).map((r) => r.href)).toEqual(["/careers"]);
  });

  it("still finds the regular menu pages", () => {
    expect(searchSite("admission", searchIndex).some((r) => r.href === "/admission")).toBe(true);
  });
});

describe("buildSearchIndex", () => {
  it("flattens children with their parent label", async () => {
    const { buildSearchIndex } = await import("./site-search");
    const index = buildSearchIndex([
      { label: "About", href: "/about", children: [{ label: "Our Story", href: "/about#our-story" }] },
    ]);
    expect(index).toEqual([
      { label: "About", href: "/about", parentLabel: undefined },
      { label: "Our Story", href: "/about#our-story", parentLabel: "About" },
    ]);
  });
});

describe("searchIndex (Resources)", () => {
  it("lists exactly Photo Gallery under Resources, and no removed anchor", () => {
    expect(searchIndex.filter((r) => r.parentLabel === "Resources").map((r) => [r.label, r.href])).toEqual([
      ["Photo Gallery", "/resources#photo-gallery"],
    ]);
    for (const r of searchIndex) expect(r.href).not.toMatch(/#(downloads|our-books)/);
  });
});

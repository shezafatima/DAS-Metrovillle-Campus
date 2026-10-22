import { describe, expect, it } from "vitest";
import { levelSlug, levelSlugs } from "./slug";

describe("levelSlug", () => {
  it("lower-cases, joins words with hyphens and keeps digits", () => {
    expect(levelSlug("Play Group")).toBe("play-group");
    expect(levelSlug("Class 4")).toBe("class-4");
    expect(levelSlug("PREP")).toBe("prep");
  });

  it("removes accents and turns other characters into single hyphens, trimmed", () => {
    expect(levelSlug("Nürsery")).toBe("nursery");
    expect(levelSlug("  Class  (8) / A ")).toBe("class-8-a");
    expect(levelSlug("---")).toBe("");
  });

  it("is empty for a name with no Latin letters or digits", () => {
    expect(levelSlug("کلاس")).toBe("");
  });
});

describe("levelSlugs", () => {
  it("makes one slug per name, in order", () => {
    expect(levelSlugs(["Play Group", "Nursery", "PREP", "Class 1"])).toEqual(["play-group", "nursery", "prep", "class-1"]);
  });

  it("numbers repeats in level order", () => {
    expect(levelSlugs(["Class 1", "class 1", "CLASS-1"])).toEqual(["class-1", "class-1-2", "class-1-3"]);
  });

  it("never lets a numbered repeat collide with another level's own slug", () => {
    expect(levelSlugs(["Class 1", "Class 1", "Class 1 2"])).toEqual(["class-1", "class-1-2", "class-1-2-2"]);
  });

  it("uses level-<position> for a name with nothing usable, and numbers those too", () => {
    expect(levelSlugs(["Class 1", "کلاس", "!!!"])).toEqual(["class-1", "level-2", "level-3"]);
    expect(levelSlugs(["level-1", "کلاس"])).toEqual(["level-1", "level-2"]);
    expect(levelSlugs(["level-2", "کلاس"])).toEqual(["level-2", "level-2-2"]);
  });

  it("is empty for no levels", () => {
    expect(levelSlugs([])).toEqual([]);
  });
});

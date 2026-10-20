import { describe, expect, it } from "vitest";
import { offeredClasses } from "./offered-classes";

const level = (id: string, name: string) => ({ id, name, ageRule: "x" });
const item = (name: string, levelId = "") => ({ name, levelId });

const LEVELS = [level("a", "Playgroup"), level("b", "Nursery"), level("c", "Class 1"), level("d", "Class 2")];

describe("offeredClasses (014b)", () => {
  it("lists the ticked levels in Class Levels order, not in tick order", () => {
    const admission = { classes: [item("Class 2", "d"), item("Playgroup", "a"), item("Class 1", "c")] };
    expect(offeredClasses(admission, { levels: LEVELS })).toEqual(["Playgroup", "Class 1", "Class 2"]);
  });

  it("uses the level's current name, not the snapshot stored on the tick", () => {
    const admission = { classes: [item("Old name", "c")] };
    expect(offeredClasses(admission, { levels: [level("c", "Grade 1")] })).toEqual(["Grade 1"]);
  });

  it("ignores a ticked id that has no live level (the level was deleted)", () => {
    const admission = { classes: [item("Class 9", "gone"), item("Class 1", "c")] };
    expect(offeredClasses(admission, { levels: LEVELS })).toEqual(["Class 1"]);
  });

  it("offers a typed name that is not linked after the ticked levels, in saved order", () => {
    const admission = { classes: [item("Grade 9"), item("Class 1", "c"), item("Grade 10")] };
    expect(offeredClasses(admission, { levels: LEVELS })).toEqual(["Class 1", "Grade 9", "Grade 10"]);
  });

  it("de-duplicates ignoring case and repeated spaces, the first one winning", () => {
    const admission = { classes: [item("class  1"), item("Class 1", "c"), item("CLASS 1")] };
    // The level comes first (it is a ticked level), then the unlinked duplicates are dropped.
    expect(offeredClasses(admission, { levels: LEVELS })).toEqual(["Class 1"]);
  });

  it("trims names and skips blank ones", () => {
    expect(offeredClasses({ classes: [item("  Class 3  "), item("   ")] }, { levels: [] })).toEqual(["Class 3"]);
  });

  it("is empty when nothing is ticked and nothing is typed, so the form shows Closed", () => {
    expect(offeredClasses({ classes: [] }, { levels: LEVELS })).toEqual([]);
    expect(offeredClasses({ classes: [item("Class 1", "gone")] }, { levels: LEVELS })).toEqual([]);
  });

  it("with no Class Levels yet, today's typed names are all offered unchanged (the deploy is a no-op for parents)", () => {
    const admission = { classes: [item("Playgroup"), item("Class 1"), item("Class 2")] };
    expect(offeredClasses(admission, { levels: [] })).toEqual(["Playgroup", "Class 1", "Class 2"]);
  });
});

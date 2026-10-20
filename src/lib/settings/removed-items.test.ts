import { describe, expect, it } from "vitest";
import { removedItems } from "./removed-items";
import type { GroupDefinition } from "./types";

// A three-level nested list, like the syllabus: levels > subjects > groups.
const def: GroupDefinition = {
  key: "syllabi",
  label: "Test",
  fields: [
    {
      type: "list",
      key: "levels",
      label: "Levels",
      itemLabel: "level",
      maxItems: 20,
      itemFields: [
        { type: "text", key: "name", label: "Name", maxLength: 60 },
        {
          type: "list",
          key: "subjects",
          label: "Subjects",
          itemLabel: "subject",
          maxItems: 10,
          itemFields: [
            { type: "text", key: "name", label: "Name", maxLength: 60 },
            {
              type: "list",
              key: "groups",
              label: "Groups",
              itemLabel: "group",
              maxItems: 20,
              itemFields: [{ type: "text", key: "heading", label: "Heading", maxLength: 120 }],
            },
          ],
        },
      ],
    },
  ],
} as unknown as GroupDefinition;

const group = (id: string, heading: string) => ({ id, heading });
const subject = (id: string, name: string, groups: ReturnType<typeof group>[] = []) => ({ id, name, groups });
const level = (id: string, name: string, subjects: ReturnType<typeof subject>[] = []) => ({ id, name, subjects });

const before = {
  levels: [
    level("L1", "Class 1", [subject("S1", "English", [group("G1", "Reading"), group("G2", "Writing")]), subject("S2", "Maths")]),
    level("L2", "Class 2", [subject("S3", "English")]),
    level("L3", "Class 3", [subject("S4", "Science", [group("G3", "Plants")])]),
  ],
};

describe("removedItems", () => {
  it("returns an item missing from the saved value, with its path before the save, a readable label and its full value", () => {
    const after = { levels: [before.levels[0], before.levels[1], level("L3", "Class 3", [])] };
    const removed = removedItems(def, before, after);
    expect(removed).toEqual([
      { path: "levels.2.subjects.0", label: "Class 3 · Science", value: { id: "S4", name: "Science", groups: [{ id: "G3", heading: "Plants" }] } },
    ]);
  });

  it("returns a removed level once, with its subjects and groups inside the value, not once per child", () => {
    const after = { levels: [before.levels[1], before.levels[2]] };
    const removed = removedItems(def, before, after);
    expect(removed).toHaveLength(1);
    expect(removed[0].path).toBe("levels.0");
    expect(removed[0].label).toBe("Class 1");
    expect(removed[0].value).toEqual(before.levels[0]);
  });

  it("finds a removed group at the deepest level, with the full trail as its label", () => {
    const after = {
      levels: [level("L1", "Class 1", [subject("S1", "English", [group("G1", "Reading")]), subject("S2", "Maths")]), before.levels[1], before.levels[2]],
    };
    expect(removedItems(def, before, after)).toEqual([
      { path: "levels.0.subjects.0.groups.1", label: "Class 1 · English · Writing", value: { id: "G2", heading: "Writing" } },
    ]);
  });

  it("reports several removals across levels", () => {
    const after = { levels: [level("L1", "Class 1", [subject("S1", "English", [group("G1", "Reading"), group("G2", "Writing")])]), before.levels[2]] };
    const paths = removedItems(def, before, after).map((item) => item.path);
    expect(paths).toEqual(["levels.0.subjects.1", "levels.1"]);
  });

  it("returns nothing when items are only reordered, renamed or edited", () => {
    const after = {
      levels: [
        before.levels[2],
        level("L1", "Class One", [subject("S2", "Mathematics"), subject("S1", "English", [group("G2", "Writing 2"), group("G1", "Reading")])]),
        before.levels[1],
      ],
    };
    expect(removedItems(def, before, after)).toEqual([]);
  });

  it("falls back to the item label and position when an item has no name", () => {
    const unnamed = { levels: [{ id: "X", name: "", subjects: [] }] };
    const removed = removedItems(def, unnamed, { levels: [] });
    expect(removed[0].label).toBe("level 1");
  });

  it("works on a top-level list too (hero slides use alt/heading)", () => {
    const slides: GroupDefinition = {
      key: "hero",
      label: "Hero",
      fields: [{ type: "list", key: "slides", label: "Slides", itemLabel: "slide", maxItems: 5, itemFields: [{ type: "text", key: "alt", label: "Alt", maxLength: 100 }] }],
    } as unknown as GroupDefinition;
    const removed = removedItems(slides, { slides: [{ id: "a", alt: "Front gate" }, { id: "b", alt: "" }] }, { slides: [{ id: "b", alt: "" }] });
    expect(removed).toEqual([{ path: "slides.0", label: "Front gate", value: { id: "a", alt: "Front gate" } }]);
  });

  it("returns nothing when there was nothing before", () => {
    expect(removedItems(def, {}, { levels: [before.levels[0]] })).toEqual([]);
    expect(removedItems(def, { levels: [] }, { levels: [] })).toEqual([]);
  });

  it("returns a detached copy of the value", () => {
    const removed = removedItems(def, before, { levels: [] });
    removed[0].value.name = "changed";
    expect(before.levels[0].name).toBe("Class 1");
  });
});

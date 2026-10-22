import { describe, expect, it } from "vitest";
import {
  countGroupTopics,
  countLevelTopics,
  countSubjectTopics,
  countSyllabusTopics,
  duplicateNames,
  isDuplicateName,
  levelsOf,
  newGroup,
  newLevel,
  newSubject,
  parseTopics,
} from "./edit";

const group = (topics: string[], intro = "") => ({ id: crypto.randomUUID(), heading: "", intro, topics });
const subject = (...groups: ReturnType<typeof group>[]) => ({ id: crypto.randomUUID(), name: "English", groups });
const level = (...subjects: ReturnType<typeof subject>[]) => ({ id: crypto.randomUUID(), name: "Class 1", subjects });

describe("parseTopics", () => {
  it("trims every line and ignores blank ones, keeping the order", () => {
    expect(parseTopics("  Alphabet  \n\n   \nPhonics\r\n\tCVC words ")).toEqual(["Alphabet", "Phonics", "CVC words"]);
  });

  it("is empty for empty or whitespace-only text", () => {
    expect(parseTopics("")).toEqual([]);
    expect(parseTopics("  \n \n")).toEqual([]);
  });
});

describe("topic counts", () => {
  const a = level(subject(group(["a", "b"]), group(["c"])), subject(group(["d", "e", "f"])));

  it("counts a group, a subject, a level and a whole syllabus", () => {
    expect(countGroupTopics(a.subjects[0].groups[0])).toBe(2);
    expect(countSubjectTopics(a.subjects[0])).toBe(3);
    expect(countSubjectTopics(a.subjects[1])).toBe(3);
    expect(countLevelTopics(a)).toBe(6);
    expect(countSyllabusTopics([a, level(subject(group(["x"])))])).toBe(7);
  });

  it("an intro-only group has no topics", () => {
    expect(countGroupTopics(group([], "Only an intro"))).toBe(0);
  });

  it("an empty level or subject counts zero", () => {
    expect(countLevelTopics(level())).toBe(0);
    expect(countSubjectTopics(subject())).toBe(0);
    expect(countSyllabusTopics([])).toBe(0);
  });
});

describe("duplicateNames", () => {
  it("finds repeats ignoring case and repeated spaces, never blank names", () => {
    const duplicates = duplicateNames(["Class 1", "class  1", "Class 2", "", "  ", ""]);
    expect(isDuplicateName(duplicates, "CLASS 1")).toBe(true);
    expect(isDuplicateName(duplicates, "Class 2")).toBe(false);
    expect(isDuplicateName(duplicates, "")).toBe(false);
  });

  it("is empty when every name is different", () => {
    expect(duplicateNames(["a", "b"]).size).toBe(0);
  });
});

describe("new items", () => {
  it("are blank, with fresh ids", () => {
    expect(newLevel()).toMatchObject({ name: "", subjects: [] });
    expect(newSubject()).toMatchObject({ name: "", groups: [] });
    expect(newGroup()).toMatchObject({ heading: "", intro: "", topics: [] });
    expect(newLevel().id).not.toBe(newLevel().id);
  });
});

describe("levelsOf", () => {
  it("reads a group value as typed lists and tolerates missing parts", () => {
    const levels = levelsOf({ levels: [{ id: "l1", name: "Nursery", subjects: [{ id: "s1", name: "English", groups: [{ id: "g1", topics: ["a", 2] }] }] }, { id: "l2" }] });
    expect(levels).toEqual([
      { id: "l1", name: "Nursery", subjects: [{ id: "s1", name: "English", groups: [{ id: "g1", heading: "", intro: "", topics: ["a", "2"] }] }] },
      { id: "l2", name: "", subjects: [] },
    ]);
  });

  it("reads nothing as no levels", () => {
    expect(levelsOf({})).toEqual([]);
    expect(levelsOf({ levels: "x" })).toEqual([]);
  });
});

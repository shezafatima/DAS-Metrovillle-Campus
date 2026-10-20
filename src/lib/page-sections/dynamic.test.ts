import { describe, expect, it } from "vitest";
import { pageSections } from "@/content/site-shell";
import { DYNAMIC_SECTION_IDS, filterDynamicSections, visibleSections } from "./dynamic";

const academics = [
  { id: "academic-overview", label: "Academic Overview" },
  { id: "syllabi", label: "Syllabi" },
  { id: "examination", label: "Examination" },
  { id: "teachers-training", label: "Teachers' Training" },
  { id: "hifz-e-quran", label: "Hifz-e-Quran" },
];
const admission = [
  { id: "admission-procedure", label: "Admission Procedure" },
  { id: "class-levels", label: "Class Levels" },
  { id: "uniform", label: "Uniform" },
];

const ids = (sections: { id: string }[]) => sections.map((section) => section.id);

describe("filterDynamicSections", () => {
  it("drops a dynamic section whose content is absent and keeps the order of the rest", () => {
    expect(ids(filterDynamicSections(academics, { syllabi: false, examination: true }))).toEqual([
      "academic-overview",
      "examination",
      "teachers-training",
      "hifz-e-quran",
    ]);
  });

  it("drops a dynamic section whose presence is not given", () => {
    expect(ids(filterDynamicSections(admission, {}))).toEqual(["admission-procedure", "uniform"]);
    expect(ids(filterDynamicSections(admission, { "class-levels": false }))).toEqual(["admission-procedure", "uniform"]);
  });

  it("keeps every section when all dynamic ones have content", () => {
    expect(ids(filterDynamicSections(academics, { syllabi: true, examination: true }))).toEqual(ids(academics));
    expect(ids(filterDynamicSections(admission, { "class-levels": true }))).toEqual(ids(admission));
  });

  it("never removes a section that is not dynamic", () => {
    const sections = filterDynamicSections(academics, {});
    expect(ids(sections)).toEqual(["academic-overview", "teachers-training", "hifz-e-quran"]);
  });
});

describe("visibleSections", () => {
  it("keeps the page's non-dynamic sections whatever the presence", () => {
    for (const page of ["academics", "admission"] as const) {
      const expected = pageSections[page].filter((section) => !(DYNAMIC_SECTION_IDS as readonly string[]).includes(section.id));
      expect(visibleSections(page, {})).toEqual(expected);
    }
  });

  it("returns every section of the page when all dynamic ones have content", () => {
    const all = { syllabi: true, examination: true, "class-levels": true };
    expect(visibleSections("academics", all)).toEqual(pageSections.academics);
    expect(visibleSections("admission", all)).toEqual(pageSections.admission);
  });
});

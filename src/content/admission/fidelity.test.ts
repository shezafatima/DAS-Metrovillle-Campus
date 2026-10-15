// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { admissionProcedure, uniformContent, uniformTitle } from "./index";

/** The reference text, one line per heading, paragraph or item (docs/content-source/admission/README.md). */
function source(name: string): string[] {
  const text = readFileSync(path.join(process.cwd(), "docs/content-source/admission", `${name}.txt`), "utf8");
  return text.split(/\r?\n/).filter((line) => line !== "" && !line.startsWith("# "));
}

/** Every string the procedure displays, in page order, written the way the source file writes it. */
function displayedProcedure(): string[] {
  const out: string[] = [];
  for (const section of admissionProcedure.sections) {
    out.push(section.heading, section.intro);
    for (const block of section.blocks) {
      switch (block.type) {
        case "paragraph":
        case "subheading":
          out.push(block.text);
          break;
        case "bullets":
        case "numbered":
          out.push(...block.items);
          break;
        case "steps":
          block.steps.forEach((step, index) => {
            // The ordered list draws the number; the source writes it.
            out.push(`${index + 1}. ${step.text}`);
            if (step.bullets) out.push(...step.bullets);
            if (step.fees) out.push(...step.fees.map((fee) => `${fee.letter} | ${fee.name} | ${fee.note}`));
          });
          break;
      }
    }
  }
  return out;
}

describe("Admission procedure is word for word (020 FR-006, SC-002)", () => {
  it("shows exactly the source lines, in the same order", () => {
    expect(displayedProcedure()).toEqual(source("procedure"));
  });

  it("records the source page", () => {
    expect(admissionProcedure.source).toBe("https://das.edu.pk/admission/");
  });
});

/** Source groups deliberately not shown: "category|gender" (requester, 2026-10-14: no Hifz girls' card). */
const LEFT_OUT = new Set(["Hifz Students’ Uniform|Girls"]);

/** The source file as groups: category, gender, items. */
function sourceGroups(): { category: string; gender: string; items: string[] }[] {
  const lines = source("uniform");
  const groups: { category: string; gender: string; items: string[] }[] = [];
  let category = "";
  for (const line of lines) {
    if (line.endsWith("Uniform")) category = line;
    else if (line === "Boys" || line === "Girls") groups.push({ category, gender: line, items: [] });
    else groups.at(-1)!.items.push(line);
  }
  return groups;
}

describe("Uniform is word for word (020 FR-021, SC-002)", () => {
  it("shows exactly the source categories, genders and items, in the same order, less the groups left out", () => {
    const expected = sourceGroups().filter((g) => !LEFT_OUT.has(`${g.category}|${g.gender}`));
    expect(uniformContent.uniform.map(({ category, gender, items }) => ({ category, gender, items }))).toEqual(expected);
  });

  it("leaves out only the Hifz girls' group, which the source still holds", () => {
    expect(sourceGroups()).toHaveLength(6);
    expect(uniformContent.uniform.map((g) => g.id)).toEqual(["kids-boys", "kids-girls", "hifz-boys", "senior-boys", "senior-girls"]);
    for (const group of uniformContent.uniform) expect(group.items).toHaveLength(5);
  });

  it("builds each card heading from the verbatim category and gender", () => {
    expect(uniformContent.uniform.map(uniformTitle)).toEqual([
      "Kids Uniform – Boys",
      "Kids Uniform – Girls",
      "Hifz Students’ Uniform – Boys",
      "Senior Students’ Uniform – Boys",
      "Senior Students’ Uniform – Girls",
    ]);
  });

  it("gives every shown group a local photo that exists, with alt text", () => {
    for (const group of uniformContent.uniform) {
      expect(group.image, group.id).toBeDefined();
      expect(existsSync(path.join(process.cwd(), "public", group.image!.src))).toBe(true);
      expect(group.image!.alt.length).toBeGreaterThan(20);
    }
  });

  it("records the source page", () => {
    expect(uniformContent.source).toBe("https://das.edu.pk/admission/uniform/");
  });
});

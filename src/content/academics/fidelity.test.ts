import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { academicOverview, hifzEQuran, teachersTraining } from "./index";

/** The client's documents as plain text (docs/content-source/academics/README.md). */
function lines(name: string): string[] {
  return readFileSync(path.join(process.cwd(), "docs/content-source/academics", `${name}.txt`), "utf8").split("\n");
}
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const isUrdu = (s: string) => ARABIC_SCRIPT.test(s);
const paragraphs = (text: string) => text.split("\n\n");

/** Lines in the documents that are deliberately not shown (spec "Findings for client approval"). */
const EXCLUDED = new Set([
  "Curiosity with Purpose", // T2
  "Managing schools (administrative staff)", // not shown: the owner chose 8 of the 19 points
  "Achieving goals for higher classroom excellence", // not shown: the owner chose 8 of the 19 points
  "School improvement programs", // not shown: the owner chose 8 of the 19 points
  "Strategic planning for schools", // not shown: the owner chose 8 of the 19 points
  "Guides for school staff development", // not shown: the owner chose 8 of the 19 points
  "Teacher training manuals", // not shown: the owner chose 8 of the 19 points
  "School law cases and concepts", // not shown: the owner chose 8 of the 19 points
  "Educational philosophy", // not shown: the owner chose 8 of the 19 points
  "Tips and new innovative ideas for fresh teachers", // not shown: the owner chose 8 of the 19 points
  "Theory and practices of training teaching faculty", // not shown: the owner chose 8 of the 19 points
  "Tips for lecturers", // not shown: the owner chose 8 of the 19 points
  "Dar-e-Arqam Foundation is working hard to improve and innovate new ways of assisting teaching faculty for knowledge-based learning and enhancing their own personal capacity through comprehensive resources. Here are just some of the resources that we currently have and are continuing to expand each day:", // intro shortened at the owner's request
]);

/** The only displayed lines that are not in a source. */
const OWNER_ADDITIONS = new Set([
  "Resources we offer to support our teaching faculty:", // intro shortened at the owner's request, pending client approval
  "This continuity in education ensures that, after completing the memorization of the Qur’an, the student can successfully continue their academic education.", // T1, pending client approval
]);

function expectFidelity(name: string, english: string[]) {
  const sourceEnglish = lines(name).filter((l) => l !== "" && !isUrdu(l));

  // 1. Every displayed English string is a line of the source, in order (owner additions aside).
  let from = 0;
  for (const s of english) {
    if (OWNER_ADDITIONS.has(s)) continue;
    const at = sourceEnglish.indexOf(s, from);
    expect(at, `not found, or out of order, in ${name}.txt: ${s}`).toBeGreaterThanOrEqual(from);
    from = at + 1;
  }
  // 2. Every English line of the source is used, except the excluded ones.
  for (const l of sourceEnglish) {
    if (EXCLUDED.has(l)) continue;
    expect(english, `unused line in ${name}.txt: ${l}`).toContain(l);
  }
  // 3. No Urdu is displayed.
  for (const s of english) expect(isUrdu(s), `Urdu in content: ${s}`).toBe(false);
}

describe("fidelity to the sources", () => {
  it("Academic Overview", () => {
    expectFidelity("academic-overview", [
      academicOverview.heading,
      academicOverview.subheading,
      ...paragraphs(academicOverview.body),
    ]);
  });

  it("Teachers' Training", () => {
    expectFidelity("teachers-training", [
      ...paragraphs(teachersTraining.intro),
      ...teachersTraining.items.map((i) => i.text),
    ]);
  });

  it("Hifz-e-Quran", () => {
    expectFidelity("hifz-e-quran", [
      hifzEQuran.heading,
      hifzEQuran.subheading,
      ...paragraphs(hifzEQuran.intro),
      ...hifzEQuran.subsections.flatMap((s) => {
        // The points are the source paragraph split at sentence ends: rejoin them (owner additions stay apart).
        const texts = s.points.map((p) => p.text);
        const added = texts.filter((t) => OWNER_ADDITIONS.has(t));
        return [s.heading, texts.filter((t) => !OWNER_ADDITIONS.has(t)).join(" "), ...added];
      }),
    ]);
  });
});

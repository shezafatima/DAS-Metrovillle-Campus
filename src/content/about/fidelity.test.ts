import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { coreValues, messagesContent, ourStory, visionMission } from "./index";

/** The client's documents as plain text (docs/content-source/about/README.md). */
function lines(name: string): string[] {
  return readFileSync(path.join(process.cwd(), "docs/content-source/about", `${name}.txt`), "utf8").split(/\r?\n/);
}
const isUrdu = (s: string) => /[؀-ۿ]/.test(s);
const paragraphs = (text: string) => text.split("\n\n");

/** Lines in the documents that are deliberately not shown (spec "Source Content Findings"). */
const EXCLUDED = new Set([
  "Knowledge That Inspires", // Finding 1
  "Excellence Rooted in Values", // Finding 1
  "Creating Thinkers with Integrity", // Finding 1
  "Where Intelligence Meets Character", // Finding 1
  "(Page No 1)", // Finding 2
  "Welcome Note", // Finding 3
  "Metroville Campus is committed to providing an educational environment where academic excellence, Islamic values, and character development go hand in hand. We strive to inspire every child to learn with confidence, grow with integrity, and become a responsible member of society.", // Finding 3
  "We warmly welcome you to the Dar-e-Arqam family and look forward to partnering with you in shaping your child's future.", // Finding 3
]);

function expectFidelity(name: string, english: string[], urdu: string[]) {
  const source = lines(name);
  const sourceEnglish = source.filter((l) => l !== "" && !isUrdu(l));

  // 1. Every displayed English string is a line of the document, in order.
  let from = 0;
  for (const s of english) {
    const at = sourceEnglish.indexOf(s, from);
    expect(at, `not found, or out of order, in ${name}.txt: ${s}`).toBeGreaterThanOrEqual(from);
    from = at + 1;
  }
  // 2. Every English line is used, except the excluded taglines.
  for (const l of sourceEnglish) {
    if (EXCLUDED.has(l)) continue;
    expect(english, `unused line in ${name}.txt: ${l}`).toContain(l);
  }
  // 3. Every stored Urdu string is a line of the document (after trimming).
  const sourceUrdu = source.filter(isUrdu).map((l) => l.trim());
  for (const s of urdu) expect(sourceUrdu, `Urdu not in ${name}.txt: ${s}`).toContain(s);
}

describe("fidelity to the client's documents", () => {
  it("Our Story", () => {
    const u = ourStory.urdu!;
    expectFidelity(
      "our-story",
      [ourStory.heading, ourStory.subheading, ...paragraphs(ourStory.body)],
      [u.heading, u.subheading, ...paragraphs(u.body)],
    );
  });

  it("Vision & Mission", () => {
    const u = visionMission.urdu!;
    expectFidelity(
      "vision-mission",
      [
        visionMission.heading,
        visionMission.subheading,
        visionMission.vision.heading,
        visionMission.vision.tagline!,
        visionMission.vision.body,
        visionMission.mission.heading,
        visionMission.mission.body,
      ],
      [u.vision.heading, u.vision.tagline!.text, u.vision.body, u.mission.heading, u.mission.body],
    );
  });

  it("Messages", () => {
    expectFidelity(
      "messages",
      messagesContent.messages.flatMap((m) => [m.body, m.name, m.designation]),
      [],
    );
  });

  it("Core Values", () => {
    const u = coreValues.urdu!;
    expectFidelity(
      "core-values",
      [
        coreValues.heading,
        coreValues.subheading,
        coreValues.intro,
        ...coreValues.values.flatMap((v) => [v.name, v.description!]),
      ],
      [u.heading, u.subheading, u.intro, ...u.values.flatMap((v) => [v.name, v.description!])],
    );
  });
});

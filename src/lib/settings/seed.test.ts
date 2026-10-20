// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { syllabiSeed } from "@/content/seed/syllabi";
import { examinationSeed } from "@/content/seed/examination";
import { portalLinksSeed } from "@/content/seed/portal-links";
import { defaultsFor } from "./defaults";
import { GROUPS } from "./registry";
import { SEED_ACTOR, SEED_SECTIONS, checkSeedData, isSeedSection } from "./seed";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

describe("the seed data files (014b)", () => {
  it("syllabi: the eleven levels of the reference site, in its order, each with subjects and topics within every limit", () => {
    expect(syllabiSeed.levels.map((level) => level.name)).toEqual(["Play Group", "Nursery", "PREP", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"]);
    for (const level of syllabiSeed.levels) {
      expect(level.subjects.length, level.name).toBeGreaterThan(0);
      for (const subject of level.subjects) {
        for (const group of subject.groups) {
          expect(group.topics.length > 0 || (group.intro ?? "") !== "", `${level.name}/${subject.name}`).toBe(true);
          for (const topic of group.topics) expect(topic.length, topic).toBeLessThanOrEqual(200);
        }
      }
    }
  });

  it("syllabi: the Play Group tab is the general admission information, copied as it appears, with its paragraphs as intros", () => {
    const playGroup = syllabiSeed.levels[0];
    expect(playGroup.subjects.map((subject) => subject.name)).toEqual(["General Information", "Fee"]);
    const intros = playGroup.subjects.flatMap((subject) => subject.groups.map((group) => group.intro ?? ""));
    expect(intros.some((intro) => intro.startsWith("Admission will be confirmed on deposit of fee"))).toBe(true);
    expect(intros.some((intro) => intro.startsWith("Once the admission is confirmed by the Principal"))).toBe(true);
  });

  it("syllabi: the Nursery tab holds two stages, so its subjects carry the stage's name", () => {
    const nursery = syllabiSeed.levels[1];
    expect(nursery.subjects.map((subject) => subject.name)).toEqual(["Pre-Nursery: ENGLISH", "Pre-Nursery: MATHEMATICS", "Nursery: ENGLISH", "Nursery: MATHEMATICS"]);
  });

  it("syllabi: the one line over the 200-character limit is seeded as two topics, nothing lost, and the report says so", () => {
    const grammar = syllabiSeed.levels[5].subjects.find((subject) => subject.name === "English")!.groups.find((group) => group.heading === "Grammar")!;
    const joined = grammar.topics.join(", ");
    expect(joined).toContain("Noun, Verb, Adjective, Pronoun, Apostrophe, Preposition, Possessive Pronoun, Punctuation adding full stop, Comma, Question mark, Capital letters, Inverted commas, Present & past simple and continuous (affirmative, negative, interrogative)");
    expect(grammar.topics.every((topic) => topic.length <= 200)).toBe(true);
    expect(syllabiSeed.adaptations.some((line) => line.includes("Class 3") && line.includes("two topics"))).toBe(true);
  });

  it("syllabi: numbered lists are reported as seeded as bullets", () => {
    expect(syllabiSeed.adaptations.some((line) => line.includes("numbered list"))).toBe(true);
  });

  it("examination: the four blocks of the reference page, verbatim", () => {
    expect(examinationSeed.blocks.map((block) => block.heading)).toEqual(["NURSERY, PREP", "Grade-1 – 7", "Class 8-10", "UNIFIED EXAMINATION"]);
    expect(examinationSeed.blocks[0].body).toBe("All assessments are carried out in a relaxed and informal manner. There are no formal end of term tests.");
  });

  it("portal links: the six labels in the reference order, with their addresses", () => {
    expect(portalLinksSeed.links.map((link) => link.label)).toEqual(["DAS Portal", "ePortal", "Student Login", "Mail Login", "LMS App", "Alumni Registration"]);
    expect(portalLinksSeed.links.find((link) => link.label === "Student Login")?.url).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+/);
  });

  it.each(SEED_SECTIONS)("%s: the data passes its group's own schema, limits included, once ids are added", (section) => {
    expect(checkSeedData(section)).toEqual({ ok: true });
  });

  it("knows its three sections", () => {
    expect(SEED_SECTIONS).toEqual(["syllabi", "examination", "portal-links"]);
    expect(isSeedSection("syllabi")).toBe(true);
    expect(isSeedSection("class-levels")).toBe(false);
    expect(isSeedSection(undefined)).toBe(false);
  });
});

async function stored(group: string) {
  const { Settings } = await import("@/models/settings");
  return Settings.findById(group).lean();
}

describeWithDb("seedSection (014b: dry run by default, --confirm to write, never overwrites)", ["settings"], () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["syllabi", "syllabi", { levels: 11 }],
    ["examination", "examination", { blocks: 4 }],
    ["portal-links", "portalLinks", { links: 6, insecure: 3 }],
  ] as const)("%s: a dry run reports what would be written and writes nothing", async (section, group, counts) => {
    const { seedSection } = await import("./seed");
    const report = await seedSection(section);
    expect(report).toMatchObject({ section, outcome: "dry_run", counts: expect.objectContaining(counts) });
    expect(report.lines.length).toBeGreaterThan(0);
    expect(report.adaptations.length).toBeGreaterThan(0);
    expect(await stored(group)).toBeNull();
  });

  it("portal-links: the dry run lists the http:// addresses that will show the not-secure warning, Student Login among them", async () => {
    const { seedSection } = await import("./seed");
    const report = await seedSection("portal-links");
    expect(report.insecure.some((line) => line.startsWith("Student Login: http://"))).toBe(true);
    expect(report.insecure).toHaveLength(3);
  });

  it.each([
    ["syllabi", "syllabi", "levels"],
    ["examination", "examination", "blocks"],
    ["portal-links", "portalLinks", "links"],
  ] as const)("%s: --confirm writes the content, marks it pending client confirmation and logs it", async (section, group, key) => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { seedSection } = await import("./seed");
    const report = await seedSection(section, { confirm: true });
    expect(report.outcome).toBe("written");

    const doc = await stored(group);
    expect(doc).toMatchObject({ version: 1, updatedBy: SEED_ACTOR });
    expect((doc?.data[key] as unknown[]).length).toBeGreaterThan(0);
    expect(doc?.pendingConfirmation).toMatchObject({ source: expect.stringContaining("das.edu.pk") });
    expect(doc?.pendingConfirmation?.seededAt).toBeInstanceOf(Date);
    const line = info.mock.calls.map((call) => String(call[0])).find((text) => text.includes("settings_seeded"));
    expect(JSON.parse(line!)).toMatchObject({ type: "settings_seeded", group, actor: SEED_ACTOR });
  });

  it("running --confirm twice leaves the content as it was after the first run (SC-008)", async () => {
    const { seedSection } = await import("./seed");
    expect((await seedSection("examination", { confirm: true })).outcome).toBe("written");
    const first = await stored("examination");
    expect((await seedSection("examination", { confirm: true })).outcome).toBe("refused_existing");
    const second = await stored("examination");
    expect(second?.version).toBe(first?.version);
    expect(JSON.stringify(second?.data)).toBe(JSON.stringify(first?.data));
  });

  it("refuses when the section has any content at all, with or without --confirm, and writes nothing", async () => {
    const { Settings } = await import("@/models/settings");
    const def = GROUPS.portalLinks;
    await Settings.create({
      _id: "portalLinks",
      data: { ...defaultsFor(def), links: [{ id: crypto.randomUUID(), deletedAt: null, label: "Mine", url: "https://mine.example.org/" }] },
      version: 4,
      updatedBy: "admin@school.pk",
    });
    const { seedSection } = await import("./seed");
    expect((await seedSection("portal-links")).outcome).toBe("refused_existing");
    expect((await seedSection("portal-links", { confirm: true })).outcome).toBe("refused_existing");
    expect(await stored("portalLinks")).toMatchObject({ version: 4, updatedBy: "admin@school.pk" });
  });

  it("a group an admin emptied is seeded again, keeping its removed items, with a version check", async () => {
    const { Settings } = await import("@/models/settings");
    const removed = { id: crypto.randomUUID(), deletedAt: new Date("2026-01-01"), label: "Old", url: "https://old.example.org/" };
    await Settings.create({ _id: "portalLinks", data: { links: [removed] }, version: 5, updatedBy: "admin@school.pk" });
    const { seedSection } = await import("./seed");
    expect((await seedSection("portal-links", { confirm: true })).outcome).toBe("written");
    const doc = await stored("portalLinks");
    expect(doc).toMatchObject({ version: 6, updatedBy: SEED_ACTOR });
    const links = doc?.data.links as { label: string; deletedAt: Date | null }[];
    expect(links.filter((link) => !link.deletedAt)).toHaveLength(6);
    expect(links.find((link) => link.label === "Old")?.deletedAt).toBeInstanceOf(Date);
  });

  it("stops without writing when an admin saved between the read and the write", async () => {
    const { Settings } = await import("@/models/settings");
    await Settings.create({ _id: "portalLinks", data: { links: [] }, version: 2, updatedBy: "admin@school.pk" });
    const spy = vi.spyOn(Settings, "findOneAndUpdate").mockReturnValue({ lean: async () => null } as never);
    const { seedSection } = await import("./seed");
    expect((await seedSection("portal-links", { confirm: true })).outcome).toBe("gave_up");
    spy.mockRestore();
    expect(await stored("portalLinks")).toMatchObject({ version: 2, updatedBy: "admin@school.pk" });
  });

  it("the seeded content is what the public reader shows (a live value, no removal marker)", async () => {
    const { seedSection } = await import("./seed");
    await seedSection("syllabi", { confirm: true });
    const { toLiveValue } = await import("./items");
    const { mergeWithDefaults } = await import("./defaults");
    const doc = await stored("syllabi");
    const live = toLiveValue(GROUPS.syllabi, mergeWithDefaults(GROUPS.syllabi, doc?.data));
    expect(JSON.stringify(live)).not.toContain("deletedAt");
    expect((live.levels as { name: string }[]).map((level) => level.name)[0]).toBe("Play Group");
  });
});

// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { MAX_LINK_ATTEMPTS, planClassLinks } from "./link-classes";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const item = (id: string, name: string, levelId = "") => ({ id, name, levelId });
const level = (id: string, name: string) => ({ id, name });

describe("planClassLinks (014b)", () => {
  const LEVELS = [level("l1", "PlayGroup"), level("l2", "Class 1"), level("l3", "Class 2")];

  it("matches ignoring case, surrounding spaces and repeated spaces", () => {
    const plan = planClassLinks([item("a", "playgroup"), item("b", "  CLASS   1 ")], LEVELS);
    expect(plan.linked.map((entry) => [entry.typed, entry.level.id])).toEqual([
      ["playgroup", "l1"],
      ["  CLASS   1 ", "l2"],
    ]);
    expect(plan.unmatched).toEqual([]);
    expect(plan.duplicates).toEqual([]);
  });

  it("reports a name with no level as unmatched, and keeps it (nothing is dropped)", () => {
    const plan = planClassLinks([item("a", "Grade 9"), item("b", "Class 1")], LEVELS);
    expect(plan.unmatched).toEqual([{ itemId: "a", typed: "Grade 9" }]);
    expect(plan.linked.map((entry) => entry.itemId)).toEqual(["b"]);
  });

  it("a level that is already ticked is never linked twice: the other item is reported as a duplicate", () => {
    const plan = planClassLinks([item("a", "Class 1", "l2"), item("b", "class 1")], LEVELS);
    expect(plan.linked).toEqual([]);
    expect(plan.duplicates).toEqual([{ itemId: "b", typed: "class 1", level: level("l2", "Class 1") }]);
  });

  it("two typed names for the same level: the first links, the second is a duplicate", () => {
    const plan = planClassLinks([item("a", "Class 1"), item("b", "class 1")], LEVELS);
    expect(plan.linked.map((entry) => entry.itemId)).toEqual(["a"]);
    expect(plan.duplicates.map((entry) => entry.itemId)).toEqual(["b"]);
  });

  it("leaves items that already have a level id alone, even one whose level has since been removed", () => {
    const plan = planClassLinks([item("a", "Playgroup", "l1"), item("b", "Class 9", "gone")], LEVELS);
    expect(plan).toEqual({ linked: [], unmatched: [], duplicates: [] });
  });

  it("with no Class Levels every typed name is unmatched", () => {
    const plan = planClassLinks([item("a", "Playgroup"), item("b", "Class 1")], []);
    expect(plan.unmatched.map((entry) => entry.typed)).toEqual(["Playgroup", "Class 1"]);
  });

  it("is empty when nothing is typed", () => {
    expect(planClassLinks([], LEVELS)).toEqual({ linked: [], unmatched: [], duplicates: [] });
  });
});

async function seed({ levels, classes }: { levels: { id: string; name: string; deletedAt?: Date | null }[]; classes: Record<string, unknown>[] }) {
  const { Settings } = await import("@/models/settings");
  await Settings.create({
    _id: "classLevels",
    data: { ageReferenceDate: "07-31", levels: levels.map((entry) => ({ ageRule: "x", deletedAt: null, ...entry })) },
    version: 1,
    updatedBy: "seed",
  });
  await Settings.create({
    _id: "admission",
    data: { opensOn: "", closesOn: "", announcement: "", closedMessage: "", classes },
    version: 3,
    updatedBy: "admin@school.pk",
  });
}

async function admissionDoc() {
  const { Settings } = await import("@/models/settings");
  return Settings.findById("admission").lean();
}

describeWithDb("linkClasses (014b)", ["settings"], () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const typed = (name: string) => ({ id: randomUUID(), name, deletedAt: null });

  it("a dry run reports what would happen and writes nothing", async () => {
    await seed({ levels: [{ id: "l1", name: "PlayGroup" }, { id: "l2", name: "Class 1" }], classes: [typed("playgroup"), typed("class 1"), typed("Grade 9")] });
    const { linkClasses } = await import("./link-classes");
    const report = await linkClasses();
    expect(report).toMatchObject({ outcome: "dry_run", written: false, confirmed: false });
    expect(report.linked.map((entry) => entry.level.id)).toEqual(["l1", "l2"]);
    expect(report.unmatched.map((entry) => entry.typed)).toEqual(["Grade 9"]);
    expect(await admissionDoc()).toMatchObject({ version: 3, updatedBy: "admin@school.pk" });
    expect(((await admissionDoc())?.data.classes as { levelId?: string }[]).every((entry) => entry.levelId === undefined)).toBe(true);
  });

  it("--confirm links the matches (id and the level's name), keeps the unmatched and the deleted items, and records who", async () => {
    const deleted = { ...typed("Old class"), deletedAt: new Date("2026-01-01") };
    await seed({ levels: [{ id: "l1", name: "PlayGroup" }, { id: "l2", name: "Class 1" }], classes: [typed("playgroup"), deleted, typed("Grade 9"), typed("class 1")] });
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { linkClasses, LINK_ACTOR } = await import("./link-classes");
    const report = await linkClasses({ confirm: true });
    expect(report).toMatchObject({ outcome: "written", written: true });

    const doc = await admissionDoc();
    expect(doc).toMatchObject({ version: 4, updatedBy: LINK_ACTOR, panelSaves: { "admission-classes": { by: LINK_ACTOR } } });
    const classes = doc?.data.classes as { name: string; levelId?: string; deletedAt: Date | null }[];
    expect(classes.map((entry) => [entry.name, entry.levelId ?? "", Boolean(entry.deletedAt)])).toEqual([
      ["PlayGroup", "l1", false],
      ["Old class", "", true],
      ["Grade 9", "", false],
      ["Class 1", "l2", false],
    ]);
    const logged = info.mock.calls.map((call) => String(call[0])).find((line) => line.includes("classes_linked"));
    expect(JSON.parse(logged!)).toMatchObject({ type: "classes_linked", group: "admission", actor: LINK_ACTOR, counts: { linked: 2, unmatched: 1, duplicates: 0 } });
  });

  it("running it again links nothing and writes nothing", async () => {
    await seed({ levels: [{ id: "l1", name: "PlayGroup" }], classes: [typed("playgroup")] });
    const { linkClasses } = await import("./link-classes");
    await linkClasses({ confirm: true });
    const after = await admissionDoc();
    const second = await linkClasses({ confirm: true });
    expect(second).toMatchObject({ outcome: "nothing_to_link", written: false });
    expect((await admissionDoc())?.version).toBe(after?.version);
  });

  it("does nothing when there is no admission record", async () => {
    const { linkClasses } = await import("./link-classes");
    expect(await linkClasses({ confirm: true })).toMatchObject({ outcome: "nothing_to_link", written: false });
  });

  it("re-plans when another save lands between the read and the write, and gives up after the attempt limit", async () => {
    await seed({ levels: [{ id: "l1", name: "PlayGroup" }], classes: [typed("playgroup")] });
    const { Settings } = await import("@/models/settings");
    const spy = vi.spyOn(Settings, "findOneAndUpdate").mockReturnValue({ lean: async () => null } as never);
    const { linkClasses } = await import("./link-classes");
    const report = await linkClasses({ confirm: true });
    expect(report).toMatchObject({ outcome: "gave_up", written: false });
    expect(spy).toHaveBeenCalledTimes(MAX_LINK_ATTEMPTS);
    spy.mockRestore();
    expect(((await admissionDoc())?.data.classes as { levelId?: string }[])[0].levelId).toBeUndefined();
  });
});

// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { settingsCopy } from "@/content/admin";
import { karachiToday } from "@/lib/admission/window";
import { describeWithDb } from "@/test/db";
import { defaultsFor, mergeWithDefaults } from "./defaults";
import { panelFingerprint } from "./fingerprint";
import { toLiveValue } from "./items";
import { PANELS } from "./panels";
import { GROUPS } from "./registry";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const ACTOR = "admin@school.pk";

async function seedLevels(...names: string[]): Promise<{ id: string; name: string }[]> {
  const { Settings } = await import("@/models/settings");
  const levels = names.map((name) => ({ id: randomUUID(), name, ageRule: "x", deletedAt: null }));
  await Settings.create({ _id: "classLevels", data: { ageReferenceDate: "07-31", levels }, version: 1, updatedBy: ACTOR });
  return levels.map(({ id, name }) => ({ id, name }));
}

function freshClassesFingerprint(): string {
  const def = GROUPS.admission;
  return panelFingerprint(["classes"], toLiveValue(def, mergeWithDefaults(def, defaultsFor(def))));
}

async function saveClasses(classes: unknown[], expectedFingerprint = freshClassesFingerprint()) {
  const { savePanel } = await import("./mutations");
  return savePanel({ panel: PANELS["admission-classes"], expectedFingerprint, data: { classes }, actorEmail: ACTOR });
}

async function admissionDoc() {
  const { Settings } = await import("@/models/settings");
  return Settings.findById("admission").lean();
}

describeWithDb("the admission-classes panel check (014b: ticked Class Levels)", ["settings", "settingsChanges"], () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is registered for the classes and window panels only", async () => {
    const { PANEL_CHECKS } = await import("./panel-checks");
    expect(Object.keys(PANEL_CHECKS)).toEqual(["admission-classes", "admission-window"]);
  });

  it("ticks that name a live level are saved, and the stored name is the level's current name", async () => {
    const [a, b] = await seedLevels("Playgroup", "Class 1");
    const result = await saveClasses([
      { id: randomUUID(), name: "stale snapshot", levelId: a.id },
      { id: randomUUID(), name: "another stale one", levelId: b.id },
    ]);
    expect(result).toMatchObject({ ok: true, data: { classes: [{ name: "Playgroup", levelId: a.id }, { name: "Class 1", levelId: b.id }] } });
    const stored = (await admissionDoc())?.data.classes as { name: string; levelId: string }[];
    expect(stored.map((item) => [item.name, item.levelId])).toEqual([
      ["Playgroup", a.id],
      ["Class 1", b.id],
    ]);
  });

  it("a tick for a level that no longer exists is a conflict, and nothing is written", async () => {
    const [a] = await seedLevels("Playgroup");
    const result = await saveClasses([
      { id: randomUUID(), name: "Playgroup", levelId: a.id },
      { id: randomUUID(), name: "Class 9", levelId: randomUUID() },
    ]);
    expect(result).toEqual({ ok: false, error: "conflict" });
    expect(await admissionDoc()).toBeNull();
  });

  it("an item already stored for a level that was deleted since is dropped by the next save (saving acknowledges the warning), not refused", async () => {
    const [a, b] = await seedLevels("Playgroup", "Class 1");
    const first = await saveClasses([
      { id: randomUUID(), name: "Playgroup", levelId: a.id },
      { id: "11111111-1111-4111-8111-111111111111", name: "Class 1", levelId: b.id },
    ]);
    if (!first.ok) throw new Error("expected the first save to succeed");

    // Class 1 is deleted from Class Levels; the checklist form (loaded before or after) still carries its item.
    const { Settings } = await import("@/models/settings");
    await Settings.updateOne({ _id: "classLevels" }, { $set: { "data.levels.1.deletedAt": new Date() } });

    const second = await saveClasses(
      [
        { id: randomUUID(), name: "Playgroup", levelId: a.id },
        { id: "11111111-1111-4111-8111-111111111111", name: "Class 1", levelId: b.id },
      ],
      first.fingerprint,
    );
    expect(second).toMatchObject({ ok: true });
    const stored = (await admissionDoc())?.data.classes as { levelId: string; deletedAt: Date | null }[];
    expect(stored.filter((item) => !item.deletedAt).map((item) => item.levelId)).toEqual([a.id]);
  });

  it("a NEW tick for a level that was soft-deleted is a conflict", async () => {
    const { Settings } = await import("@/models/settings");
    const gone = { id: randomUUID(), name: "Class 9", ageRule: "x", deletedAt: new Date() };
    await Settings.create({ _id: "classLevels", data: { ageReferenceDate: "07-31", levels: [gone] }, version: 1, updatedBy: ACTOR });
    expect(await saveClasses([{ id: randomUUID(), name: "Class 9", levelId: gone.id }])).toEqual({ ok: false, error: "conflict" });
  });

  it("with no Class Levels saved at all, any tick is a conflict", async () => {
    expect(await saveClasses([{ id: randomUUID(), name: "Class 1", levelId: randomUUID() }])).toEqual({ ok: false, error: "conflict" });
  });

  it("typed names that are not linked pass through untouched, with no Class Levels read needed", async () => {
    const result = await saveClasses([
      { id: randomUUID(), name: "Grade 9", levelId: "" },
      { id: randomUUID(), name: "Grade 10", levelId: "" },
    ]);
    expect(result).toMatchObject({ ok: true, data: { classes: [{ name: "Grade 9", levelId: "" }, { name: "Grade 10", levelId: "" }] } });
  });

  it("a mix of a live tick and a not-linked name saves both", async () => {
    const [a] = await seedLevels("Playgroup");
    const result = await saveClasses([
      { id: randomUUID(), name: "Playgroup", levelId: a.id },
      { id: randomUUID(), name: "Grade 9", levelId: "" },
    ]);
    expect(result).toMatchObject({ ok: true });
    expect(((await admissionDoc())?.data.classes as { name: string }[]).map((item) => item.name)).toEqual(["Playgroup", "Grade 9"]);
  });

  it("a level renamed after the tick: the next save refreshes the stored name", async () => {
    const [a] = await seedLevels("Class 1");
    const first = await saveClasses([{ id: randomUUID(), name: "Class 1", levelId: a.id }]);
    if (!first.ok) throw new Error("expected the first save to succeed");

    const { Settings } = await import("@/models/settings");
    await Settings.updateOne({ _id: "classLevels" }, { $set: { "data.levels.0.name": "Grade 1" } });

    const second = await saveClasses([{ id: randomUUID(), name: "Class 1", levelId: a.id }], first.fingerprint);
    expect(second).toMatchObject({ ok: true });
    const stored = (await admissionDoc())?.data.classes as { name: string; deletedAt: Date | null }[];
    expect(stored.filter((item) => !item.deletedAt).map((item) => item.name)).toEqual(["Grade 1"]);
  });
});

// 027: the admission window's dates may not be moved to a day that has already passed.
function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function windowFingerprint(stored: Record<string, unknown> = {}): string {
  const def = GROUPS.admission;
  return panelFingerprint(["opensOn", "closesOn"], toLiveValue(def, mergeWithDefaults(def, { ...defaultsFor(def), ...stored })));
}

async function saveWindow(data: { opensOn: string; closesOn: string }, stored?: Record<string, unknown>) {
  const { savePanel } = await import("./mutations");
  return savePanel({ panel: PANELS["admission-window"], expectedFingerprint: windowFingerprint(stored), data, actorEmail: ACTOR });
}

async function seedWindow(opensOn: string, closesOn: string) {
  const { Settings } = await import("@/models/settings");
  await Settings.create({ _id: "admission", data: { opensOn, closesOn, announcement: "", closedMessage: "", classes: [] }, version: 1, updatedBy: ACTOR });
}

describeWithDb("the admission-window panel check (027: no past dates)", ["settings", "settingsChanges"], () => {
  const today = karachiToday(new Date());

  it("a past opening date is refused on its own field, and nothing is written", async () => {
    const result = await saveWindow({ opensOn: shiftDay(today, -1), closesOn: shiftDay(today, 30) });
    expect(result).toEqual({ ok: false, error: "invalid", fields: { opensOn: settingsCopy.errors.dateInPast } });
    expect(await admissionDoc()).toBeNull();
  });

  it("a past closing date is refused too, and both are named when both are past", async () => {
    const result = await saveWindow({ opensOn: shiftDay(today, -5), closesOn: shiftDay(today, -2) });
    expect(result).toEqual({ ok: false, error: "invalid", fields: { opensOn: settingsCopy.errors.dateInPast, closesOn: settingsCopy.errors.dateInPast } });
  });

  it("today and later days are saved", async () => {
    const result = await saveWindow({ opensOn: today, closesOn: shiftDay(today, 30) });
    expect(result).toMatchObject({ ok: true });
    expect((await admissionDoc())?.data).toMatchObject({ opensOn: today, closesOn: shiftDay(today, 30) });
  });

  it("a window that opened on a past day keeps that date while the closing date is moved", async () => {
    const opened = shiftDay(today, -9);
    await seedWindow(opened, shiftDay(today, 7));
    const stored = { opensOn: opened, closesOn: shiftDay(today, 7) };
    const result = await saveWindow({ opensOn: opened, closesOn: shiftDay(today, 40) }, stored);
    expect(result).toMatchObject({ ok: true });
    expect((await admissionDoc())?.data).toMatchObject({ opensOn: opened, closesOn: shiftDay(today, 40) });
  });

  it("moving the closing date of that window to a past day is refused", async () => {
    const opened = shiftDay(today, -9);
    await seedWindow(opened, shiftDay(today, 7));
    const stored = { opensOn: opened, closesOn: shiftDay(today, 7) };
    const result = await saveWindow({ opensOn: opened, closesOn: shiftDay(today, -3) }, stored);
    expect(result).toEqual({ ok: false, error: "invalid", fields: { closesOn: settingsCopy.errors.dateInPast } });
    expect((await admissionDoc())?.data).toMatchObject({ closesOn: shiftDay(today, 7) });
  });

  it("clearing a date is allowed (it closes admissions)", async () => {
    const opened = shiftDay(today, -9);
    await seedWindow(opened, shiftDay(today, 7));
    const stored = { opensOn: opened, closesOn: shiftDay(today, 7) };
    const result = await saveWindow({ opensOn: "", closesOn: "" }, stored);
    expect(result).toMatchObject({ ok: true });
    expect((await admissionDoc())?.data).toMatchObject({ opensOn: "", closesOn: "" });
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { describeWithDb } from "@/test/db";
import { settingsCopy } from "@/content/admin";
import { clearPanelCheckForTests, registerPanelCheckForTests } from "./panel-checks";
import { defaultsFor, mergeWithDefaults } from "./defaults";
import { panelFingerprint } from "./fingerprint";
import { toLiveValue } from "./items";
import { PANELS, type PanelKey } from "./panels";
import { GROUPS } from "./registry";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const verifyUploadedImage = vi.fn();
const deleteUploadedImage = vi.fn();
vi.mock("@/lib/cloudinary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloudinary")>();
  return {
    ...actual,
    verifyUploadedImage: (...args: unknown[]) => verifyUploadedImage(...args),
    deleteUploadedImage: (...args: unknown[]) => deleteUploadedImage(...args),
  };
});

const ACTOR = "admin@school.pk";

function statsData(students = 1000) {
  return { students, books: 5, teachers: 6, campuses: 7 };
}

function cloudImage(name: string, folder = "settings/gallery") {
  return {
    url: `https://res.cloudinary.com/demo/image/upload/v1/${folder}/${name}.jpg`,
    publicId: `${folder}/${name}`,
    width: 800,
    height: 600,
  };
}

function slide(o: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    desktop: { url: "/images/hero/placeholder-desktop.svg", publicId: "", width: 1920, height: 700 },
    mobile: null,
    alt: "A slide",
    heading: "",
    buttonLabel: "",
    buttonLink: "",
    visible: true,
    ...o,
  };
}

function heroWith(...names: string[]) {
  return { displaySeconds: 5, slides: names.map((name) => slide({ desktop: cloudImage(name, "settings/hero") })) };
}

function fields(key: PanelKey) {
  const source = PANELS[key].source;
  if (source.kind !== "group") throw new Error("not a group panel");
  return source;
}

/** The fingerprint a never-saved group's panel loads with. */
function freshFingerprint(key: PanelKey): string {
  const { group, fields: keys } = fields(key);
  const def = GROUPS[group];
  return panelFingerprint(keys, toLiveValue(def, mergeWithDefaults(def, defaultsFor(def))));
}

async function api() {
  return import("./mutations");
}

async function save(key: PanelKey, expectedFingerprint: string, data: unknown, actorEmail = ACTOR) {
  const { savePanel } = await api();
  return savePanel({ panel: PANELS[key], expectedFingerprint, data, actorEmail });
}

/** Saves and returns the new fingerprint, failing the test if the save did not succeed. */
async function saveOk(key: PanelKey, expectedFingerprint: string, data: unknown, actorEmail = ACTOR): Promise<string> {
  const result = await save(key, expectedFingerprint, data, actorEmail);
  if (!result.ok) throw new Error(`expected ${key} to save, got ${JSON.stringify(result)}`);
  return result.fingerprint;
}

async function doc(group: string) {
  const { Settings } = await import("@/models/settings");
  return Settings.findById(group).lean();
}

async function changes(group?: string) {
  const { SettingsChange } = await import("@/models/settings-change");
  return SettingsChange.find(group ? { group } : {}).lean();
}

describeWithDb("savePanel (014: partial saves, fingerprint check, group compare-and-set)", ["settings", "settingsChanges"], () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyUploadedImage.mockResolvedValue({ ok: true });
  });

  it("the first save inserts version 1 with the actor and the panel's own save marker", async () => {
    const result = await save("stats", freshFingerprint("stats"), statsData());
    expect(result).toMatchObject({ ok: true, version: 1, data: { students: 1000 } });
    expect(await doc("stats")).toMatchObject({ _id: "stats", version: 1, updatedBy: ACTOR, data: { students: 1000 }, panelSaves: { stats: { by: ACTOR } } });
  });

  it("a save with the current fingerprint moves to the next version and returns a new fingerprint", async () => {
    const first = await saveOk("stats", freshFingerprint("stats"), statsData(1));
    const second = await save("stats", first, statsData(2), "other@school.pk");
    expect(second).toMatchObject({ ok: true, version: 2, data: { students: 2 } });
    expect(second.ok && second.fingerprint).not.toBe(first);
    expect(await doc("stats")).toMatchObject({ version: 2, updatedBy: "other@school.pk" });
  });

  it("a stale fingerprint is refused as a conflict and stores nothing", async () => {
    const first = await saveOk("stats", freshFingerprint("stats"), statsData(1));
    await saveOk("stats", first, statsData(2));
    expect(await save("stats", first, statsData(99))).toEqual({ ok: false, error: "conflict" });
    expect(await doc("stats")).toMatchObject({ version: 2, data: { students: 2 } });
  });

  it("saving the same values again is not a conflict (the fingerprint is of the data, not a counter)", async () => {
    const first = await saveOk("stats", freshFingerprint("stats"), statsData(1));
    const again = await save("stats", first, statsData(1));
    expect(again).toMatchObject({ ok: true, version: 2 });
    expect(again.ok && again.fingerprint).toBe(first);
  });

  it("two simultaneous saves of the same panel from the same state: exactly one succeeds", async () => {
    const base = await saveOk("stats", freshFingerprint("stats"), statsData(1));
    const results = await Promise.all([save("stats", base, statsData(10), "a@school.pk"), save("stats", base, statsData(20), "b@school.pk")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, error: "conflict" }]);
  });

  it("two first saves racing on a never-saved group: exactly one succeeds", async () => {
    const fp = freshFingerprint("stats");
    const results = await Promise.all([save("stats", fp, statsData(10), "a@school.pk"), save("stats", fp, statsData(20), "b@school.pk")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, error: "conflict" }]);
  });

  it("invalid data is refused with field errors and nothing is written", async () => {
    const result = await save("stats", freshFingerprint("stats"), { ...statsData(), students: -5 });
    expect(result).toMatchObject({ ok: false, error: "invalid", fields: { students: settingsCopy.errors.wholeNumber } });
    expect(await doc("stats")).toBeNull();
  });

  // ── 014: partial saves of the admission group ──────────────────────────

  it("keys outside the panel are never stored", async () => {
    const result = await save("admission-messages", freshFingerprint("admission-messages"), {
      announcement: "Open for Class 1",
      closedMessage: "Opening soon",
      opensOn: "2027-01-01",
      closesOn: "2027-03-31",
      classes: [{ id: randomUUID(), name: "Class 1" }],
      somethingElse: "x",
    });
    expect(result).toMatchObject({ ok: true, data: { announcement: "Open for Class 1", closedMessage: "Opening soon" } });
    expect(result.ok && Object.keys(result.data).sort()).toEqual(["announcement", "closedMessage"]);
    const stored = await doc("admission");
    expect(stored?.data).toEqual({ opensOn: "", closesOn: "", announcement: "Open for Class 1", closedMessage: "Opening soon", classes: [] });
  });

  it("an admin's own save of one panel never makes a sibling panel stale (FR-012)", async () => {
    const windowFp = freshFingerprint("admission-window");
    await saveOk("admission-messages", freshFingerprint("admission-messages"), { announcement: "Open", closedMessage: "Soon" });
    const windowSave = await save("admission-window", windowFp, { opensOn: "2027-01-01", closesOn: "2027-03-31" });
    expect(windowSave).toMatchObject({ ok: true, version: 2 });
    expect((await doc("admission"))?.data).toMatchObject({ announcement: "Open", closedMessage: "Soon", opensOn: "2027-01-01", closesOn: "2027-03-31" });
  });

  it("another admin's save of a sibling panel is kept, never overwritten (FR-010)", async () => {
    const classesFp = freshFingerprint("admission-classes");
    await saveOk("admission-messages", freshFingerprint("admission-messages"), { announcement: "From X", closedMessage: "X" }, "x@school.pk");
    await saveOk("admission-classes", classesFp, { classes: [{ id: randomUUID(), name: "Class 1" }] }, "y@school.pk");
    const stored = await doc("admission");
    expect(stored?.data).toMatchObject({ announcement: "From X", closedMessage: "X", classes: [{ name: "Class 1", deletedAt: null }] });
    expect(stored?.panelSaves).toMatchObject({ "admission-messages": { by: "x@school.pk" }, "admission-classes": { by: "y@school.pk" } });
  });

  it("admin X saves a panel, then admin Y saves the same panel from the old state → conflict, X's value stays", async () => {
    const fp = freshFingerprint("admission-messages");
    await saveOk("admission-messages", fp, { announcement: "From X", closedMessage: "X" }, "x@school.pk");
    expect(await save("admission-messages", fp, { announcement: "From Y", closedMessage: "Y" }, "y@school.pk")).toEqual({ ok: false, error: "conflict" });
    expect((await doc("admission"))?.data).toMatchObject({ announcement: "From X", closedMessage: "X" });
  });

  it("two concurrent saves of sibling panels both succeed and the record holds both", async () => {
    const results = await Promise.all([
      save("admission-messages", freshFingerprint("admission-messages"), { announcement: "Open", closedMessage: "Soon" }, "a@school.pk"),
      save("admission-window", freshFingerprint("admission-window"), { opensOn: "2027-01-01", closesOn: "2027-03-31" }, "b@school.pk"),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    const stored = await doc("admission");
    expect(stored).toMatchObject({ version: 2, data: { announcement: "Open", closedMessage: "Soon", opensOn: "2027-01-01", closesOn: "2027-03-31" } });
  });

  it("the window's date-order rule applies to the window panel", async () => {
    const result = await save("admission-window", freshFingerprint("admission-window"), { opensOn: "2027-03-31", closesOn: "2027-01-01" });
    expect(result).toMatchObject({ ok: false, error: "invalid", fields: { closesOn: settingsCopy.errors.closesBeforeOpens } });
  });

  it("deleting a class keeps it soft-deleted, and a later save of another panel keeps it soft-deleted", async () => {
    const a = { id: randomUUID(), name: "Class 1" };
    const b = { id: randomUUID(), name: "Class 2" };
    const first = await saveOk("admission-classes", freshFingerprint("admission-classes"), { classes: [a, b] });
    await saveOk("admission-classes", first, { classes: [a] });
    await saveOk("admission-messages", freshFingerprint("admission-messages"), { announcement: "Open", closedMessage: "" });
    const classes = (await doc("admission"))?.data.classes as { id: string; deletedAt: Date | null }[];
    expect(classes.find((c) => c.id === a.id)?.deletedAt).toBeNull();
    expect(classes.find((c) => c.id === b.id)?.deletedAt).toBeInstanceOf(Date);
  });

  it("a write that keeps losing to other saves gives up as a conflict after the attempt limit", async () => {
    const { Settings } = await import("@/models/settings");
    const { MAX_SAVE_ATTEMPTS } = await api();
    await saveOk("admission-messages", freshFingerprint("admission-messages"), { announcement: "Open", closedMessage: "" });
    const spy = vi.spyOn(Settings, "findOneAndUpdate").mockReturnValue({ lean: async () => null } as never);
    try {
      expect(await save("admission-window", freshFingerprint("admission-window"), { opensOn: "2027-01-01", closesOn: "" })).toEqual({ ok: false, error: "conflict" });
      expect(spy).toHaveBeenCalledTimes(MAX_SAVE_ATTEMPTS);
    } finally {
      spy.mockRestore();
    }
  });

  // ── 014b: pending confirmation, panel checks, the removed-item change record ──

  it("a save never changes pendingConfirmation (only the seed sets it and only the confirm actions clear it)", async () => {
    const { Settings } = await import("@/models/settings");
    const seededAt = new Date("2026-10-19T10:00:00Z");
    await Settings.create({
      _id: "stats",
      data: statsData(1),
      version: 1,
      updatedBy: "seed@school.pk",
      pendingConfirmation: { source: "das.edu.pk /x", seededAt },
    });
    const { getAdminPanels } = await import("./admin");
    const loaded = await getAdminPanels("stats", ["stats"]);
    await saveOk("stats", loaded.stats.fingerprint, statsData(2));
    const stored = (await doc("stats")) as unknown as { version: number; pendingConfirmation: { source: string; seededAt: Date } | null };
    expect(stored.version).toBe(2);
    expect(stored.pendingConfirmation).toEqual({ source: "das.edu.pk /x", seededAt });
  });

  describe("panel checks", () => {
    it("a check that refuses with conflict makes the save a conflict and writes nothing", async () => {
      registerPanelCheckForTests("stats", async () => ({ ok: false, error: "conflict" }));
      try {
        expect(await save("stats", freshFingerprint("stats"), statsData(5))).toEqual({ ok: false, error: "conflict" });
        expect(await doc("stats")).toBeNull();
      } finally {
        clearPanelCheckForTests("stats");
      }
    });

    it("a check that refuses with invalid returns its field errors and writes nothing", async () => {
      registerPanelCheckForTests("stats", async () => ({ ok: false, error: "invalid", fields: { students: "nope" } }));
      try {
        expect(await save("stats", freshFingerprint("stats"), statsData(5))).toEqual({ ok: false, error: "invalid", fields: { students: "nope" } });
        expect(await doc("stats")).toBeNull();
      } finally {
        clearPanelCheckForTests("stats");
      }
    });

    it("the data a passing check returns is what gets stored", async () => {
      registerPanelCheckForTests("stats", async (incoming) => ({ ok: true, data: { ...incoming, students: 4242 } }));
      try {
        expect(await save("stats", freshFingerprint("stats"), statsData(5))).toMatchObject({ ok: true, data: { students: 4242 } });
        expect(await doc("stats")).toMatchObject({ data: { students: 4242 } });
      } finally {
        clearPanelCheckForTests("stats");
      }
    });

    it("cannot be registered outside tests", () => {
      const previous = process.env.VITEST;
      delete process.env.VITEST;
      try {
        expect(() => registerPanelCheckForTests("stats", async () => ({ ok: true, data: {} }))).toThrow();
      } finally {
        process.env.VITEST = previous;
      }
    });
  });

  describe("change record (spec FR-007)", () => {
    it("a save that removes a slide writes one entry with the actor, the panel and the slide's full previous value", async () => {
      const a = slide({ alt: "Front gate" });
      const b = slide({ alt: "Library" });
      const fp = await saveOk("hero", freshFingerprint("hero"), { displaySeconds: 5, slides: [a, b] });
      expect(await changes("hero")).toHaveLength(0);

      await saveOk("hero", fp, { displaySeconds: 5, slides: [a] }, "remover@school.pk");
      const entries = await changes("hero");
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ group: "hero", panel: "hero", actorEmail: "remover@school.pk" });
      expect(entries[0].at).toBeInstanceOf(Date);
      expect(entries[0].removed).toHaveLength(1);
      expect(entries[0].removed[0]).toMatchObject({ path: "slides.1", label: "Library", value: expect.objectContaining({ id: b.id, alt: "Library" }) });
    });

    it("a save that only edits or reorders writes no entry", async () => {
      const a = slide({ alt: "A" });
      const b = slide({ alt: "B" });
      const fp = await saveOk("hero", freshFingerprint("hero"), { displaySeconds: 5, slides: [a, b] });
      const fp2 = await saveOk("hero", fp, { displaySeconds: 5, slides: [b, a] });
      await saveOk("hero", fp2, { displaySeconds: 6, slides: [b, { ...a, alt: "A changed" }] });
      expect(await changes()).toHaveLength(0);
    });

    it("a conflict or an invalid save writes no entry", async () => {
      const a = slide();
      const b = slide();
      const fp = await saveOk("hero", freshFingerprint("hero"), { displaySeconds: 5, slides: [a, b] });
      expect(await save("hero", "f".repeat(32), { displaySeconds: 5, slides: [a] })).toEqual({ ok: false, error: "conflict" });
      expect(await save("hero", fp, { displaySeconds: 5, slides: [{ ...a, visible: false }] })).toMatchObject({ ok: false, error: "invalid" });
      expect(await changes()).toHaveLength(0);
    });

    it("when the record cannot be written twice, the save still succeeds and the failure is logged without content", async () => {
      const { SettingsChange } = await import("@/models/settings-change");
      const logs = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const create = vi.spyOn(SettingsChange, "create").mockRejectedValue(new Error("db down") as never);
      try {
        const a = slide({ alt: "Secret caption" });
        const b = slide();
        const fp = await saveOk("hero", freshFingerprint("hero"), { displaySeconds: 5, slides: [a, b] });
        const result = await save("hero", fp, { displaySeconds: 5, slides: [a] });
        expect(result).toMatchObject({ ok: true });
        expect(create).toHaveBeenCalledTimes(2);
        const lines = logs.mock.calls.map((call) => String(call[0])).filter((line) => line.includes("settings_change_record_failed"));
        expect(lines).toHaveLength(1);
        expect(JSON.parse(lines[0])).toMatchObject({ type: "settings_change_record_failed", group: "hero", panel: "hero", counts: { removed: 1 } });
        expect(lines[0]).not.toContain("Secret caption");
      } finally {
        create.mockRestore();
        logs.mockRestore();
      }
    });

    it("the record is retried once: a first failure followed by a success still writes one entry", async () => {
      const { SettingsChange } = await import("@/models/settings-change");
      const real = SettingsChange.create.bind(SettingsChange) as (...args: unknown[]) => Promise<unknown>;
      const create = vi
        .spyOn(SettingsChange, "create")
        .mockRejectedValueOnce(new Error("blip") as never)
        .mockImplementation(((...args: unknown[]) => real(...args)) as never);
      try {
        const a = slide();
        const b = slide();
        const fp = await saveOk("hero", freshFingerprint("hero"), { displaySeconds: 5, slides: [a, b] });
        await saveOk("hero", fp, { displaySeconds: 5, slides: [a] });
        expect(await changes("hero")).toHaveLength(1);
      } finally {
        create.mockRestore();
      }
    });
  });

  // ── carried over from 005 (whole-group panels behave as groups did) ────

  it("only images that are new since the stored value are verified", async () => {
    const first = heroWith("a");
    const fp = await saveOk("hero", freshFingerprint("hero"), first);
    expect(verifyUploadedImage).toHaveBeenCalledTimes(1);
    expect(verifyUploadedImage).toHaveBeenCalledWith("settings/hero/a", "settings/hero");

    verifyUploadedImage.mockClear();
    await saveOk("hero", fp, { ...first, slides: [...first.slides, ...heroWith("b").slides] });
    expect(verifyUploadedImage).toHaveBeenCalledTimes(1);
    expect(verifyUploadedImage).toHaveBeenCalledWith("settings/hero/b", "settings/hero");
  });

  it.each(["too_large", "bad_format", "wrong_folder"] as const)(
    "a %s image is refused with the limit message, nothing is stored and the asset is removed",
    async (reason) => {
      verifyUploadedImage.mockResolvedValue({ ok: false, reason });
      const result = await save("hero", freshFingerprint("hero"), heroWith("bad"));
      expect(result).toMatchObject({ ok: false, error: "image_rejected", fields: { "slides.0.desktop": settingsCopy.errors.imageLimits } });
      expect(deleteUploadedImage).toHaveBeenCalledWith("settings/hero/bad");
      expect(await doc("hero")).toBeNull();
    },
  );

  it("an unavailable verification is reported as unavailable, storing nothing", async () => {
    verifyUploadedImage.mockResolvedValue({ ok: false, reason: "unavailable" });
    expect(await save("hero", freshFingerprint("hero"), heroWith("x"))).toEqual({ ok: false, error: "unavailable" });
    expect(deleteUploadedImage).not.toHaveBeenCalled();
  });

  it("placeholder images (empty publicId) are never sent to verification", async () => {
    expect(await save("hero", freshFingerprint("hero"), defaultsFor(GROUPS.hero))).toMatchObject({ ok: true, version: 1 });
    expect(verifyUploadedImage).not.toHaveBeenCalled();
  });

  it("a hero payload with every slide hidden is refused and the stored group is unchanged (last visible slide)", async () => {
    const keep = slide();
    const fp = await saveOk("hero", freshFingerprint("hero"), { displaySeconds: 5, slides: [keep] });
    expect(await save("hero", fp, { displaySeconds: 5, slides: [{ ...keep, visible: false }] })).toMatchObject({
      ok: false,
      error: "invalid",
      fields: { slides: settingsCopy.errors.lastVisibleSlide },
    });
    expect(await save("hero", fp, { displaySeconds: 5, slides: [] })).toMatchObject({ ok: false, error: "invalid", fields: { slides: settingsCopy.errors.lastVisibleSlide } });
    const stored = (await doc("hero")) as unknown as { version: number; data: { slides: { id: string; visible: boolean; deletedAt: unknown }[] } };
    expect(stored.version).toBe(1);
    expect(stored.data.slides).toEqual([expect.objectContaining({ id: keep.id, visible: true, deletedAt: null })]);
  });

  it("deleting a slide keeps it in the document with deletedAt and hides it from the returned value", async () => {
    const a = slide({ alt: "A" });
    const b = slide({ alt: "B" });
    const fp = await saveOk("hero", freshFingerprint("hero"), { displaySeconds: 5, slides: [a, b] });
    const result = await save("hero", fp, { displaySeconds: 5, slides: [a] });
    expect(result.ok && (result.data.slides as unknown[]).length).toBe(1);

    const stored = (await doc("hero")) as unknown as { data: { slides: { id: string; deletedAt: Date | null }[] } };
    expect(stored.data.slides.find((s) => s.id === b.id)?.deletedAt).toBeInstanceOf(Date);

    const { getAdminPanels } = await import("./admin");
    const panels = await getAdminPanels("hero", ["hero"]);
    expect((panels.hero.data.slides as { id: string }[]).map((s) => s.id)).toEqual([a.id]);
    expect(JSON.stringify(panels.hero.data)).not.toContain("deletedAt");
    expect(panels.hero.fingerprint).toBe(result.ok && result.fingerprint);
  });

  it("re-sending a deleted slide's id is refused", async () => {
    const a = slide();
    const b = slide();
    const first = await saveOk("hero", freshFingerprint("hero"), { displaySeconds: 5, slides: [a, b] });
    const second = await saveOk("hero", first, { displaySeconds: 5, slides: [a] });
    expect(await save("hero", second, { displaySeconds: 5, slides: [a, b] })).toMatchObject({ ok: false, error: "invalid" });
  });

  it("a hero image outside the hero folder is refused", async () => {
    const wrongFolder = { displaySeconds: 5, slides: [slide({ desktop: cloudImage("a", "settings/gallery") })] };
    expect(await save("hero", freshFingerprint("hero"), wrongFolder)).toMatchObject({ ok: false, error: "invalid" });
  });

  it("clearing the home video stores an empty string", async () => {
    const fp = await saveOk("video", freshFingerprint("video"), { youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" });
    expect(await save("video", fp, { youtubeUrl: "" })).toMatchObject({ ok: true, data: { youtubeUrl: "" } });
  });

  it("the gallery panel cannot be saved here", async () => {
    const { savePanel } = await api();
    expect(await savePanel({ panel: PANELS["photo-gallery"], expectedFingerprint: "0".repeat(32), data: {}, actorEmail: ACTOR })).toMatchObject({ ok: false, error: "invalid" });
  });
});

describeWithDb("getAdminPanels (014)", ["settings"], () => {
  it("a never-saved group loads defaults, the fresh fingerprint, no last save and nothing pending", async () => {
    const { getAdminPanels } = await import("./admin");
    const panels = await getAdminPanels("admission", ["admission-window", "admission-messages"]);
    expect(panels["admission-window"]).toEqual({ data: { opensOn: "", closesOn: "" }, fingerprint: freshFingerprint("admission-window"), lastSaved: null, pending: null });
    expect(panels["admission-messages"].data).toEqual({ announcement: "", closedMessage: "" });
  });

  it("each panel's last save is its own; a record saved before 014 falls back to the record's editor", async () => {
    const { Settings } = await import("@/models/settings");
    await Settings.create({ _id: "admission", data: { ...defaultsFor(GROUPS.admission), announcement: "Old" }, version: 4, updatedBy: "legacy@school.pk" });
    const { getAdminPanels } = await import("./admin");
    const before = await getAdminPanels("admission", ["admission-messages"]);
    expect(before["admission-messages"].lastSaved).toMatchObject({ by: "legacy@school.pk" });

    await saveOk("admission-messages", before["admission-messages"].fingerprint, { announcement: "New", closedMessage: "" }, "new@school.pk");
    const after = await getAdminPanels("admission", ["admission-messages", "admission-window"]);
    expect(after["admission-messages"].lastSaved).toMatchObject({ by: "new@school.pk" });
  });

  it("refuses a panel that belongs to another group", async () => {
    const { getAdminPanels } = await import("./admin");
    await expect(getAdminPanels("stats", ["hero" as never])).rejects.toThrow();
  });
});

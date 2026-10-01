// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { describeWithDb } from "@/test/db";
import { settingsCopy } from "@/content/admin";
import { defaultsFor } from "./defaults";
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

function heroWith(...names: string[]) {
  return { displaySeconds: 5, slides: names.map((name) => slide({ desktop: cloudImage(name, "settings/hero") })) };
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

describeWithDb("saveGroup (compare-and-set save)", ["settings"], () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyUploadedImage.mockResolvedValue({ ok: true });
  });

  async function api() {
    return import("./mutations");
  }

  it("the first save inserts version 1 with the actor", async () => {
    const { saveGroup } = await api();
    const result = await saveGroup({ group: "stats", expectedVersion: 0, data: statsData(), actorEmail: ACTOR });
    expect(result).toMatchObject({ ok: true, version: 1 });

    const { Settings } = await import("@/models/settings");
    const doc = await Settings.findById("stats").lean();
    expect(doc).toMatchObject({ _id: "stats", version: 1, updatedBy: ACTOR, data: { students: 1000 } });
  });

  it("a save with the right version moves to the next version", async () => {
    const { saveGroup } = await api();
    await saveGroup({ group: "stats", expectedVersion: 0, data: statsData(1), actorEmail: ACTOR });
    const second = await saveGroup({ group: "stats", expectedVersion: 1, data: statsData(2), actorEmail: "other@school.pk" });
    expect(second).toMatchObject({ ok: true, version: 2, data: { students: 2 } });

    const { Settings } = await import("@/models/settings");
    expect(await Settings.findById("stats").lean()).toMatchObject({ version: 2, updatedBy: "other@school.pk" });
  });

  it("a stale version is refused as a conflict and stores nothing", async () => {
    const { saveGroup } = await api();
    await saveGroup({ group: "stats", expectedVersion: 0, data: statsData(1), actorEmail: ACTOR });
    await saveGroup({ group: "stats", expectedVersion: 1, data: statsData(2), actorEmail: ACTOR });

    const stale = await saveGroup({ group: "stats", expectedVersion: 1, data: statsData(99), actorEmail: ACTOR });
    expect(stale).toEqual({ ok: false, error: "conflict" });

    const { Settings } = await import("@/models/settings");
    expect(await Settings.findById("stats").lean()).toMatchObject({ version: 2, data: { students: 2 } });
  });

  it("expecting version 0 when a document exists, or a version when none exists, is a conflict", async () => {
    const { saveGroup } = await api();
    expect(await saveGroup({ group: "stats", expectedVersion: 3, data: statsData(), actorEmail: ACTOR })).toEqual({ ok: false, error: "conflict" });
    await saveGroup({ group: "stats", expectedVersion: 0, data: statsData(), actorEmail: ACTOR });
    expect(await saveGroup({ group: "stats", expectedVersion: 0, data: statsData(5), actorEmail: ACTOR })).toEqual({ ok: false, error: "conflict" });
  });

  it("two simultaneous saves with the same expected version: exactly one succeeds", async () => {
    const { saveGroup } = await api();
    await saveGroup({ group: "stats", expectedVersion: 0, data: statsData(1), actorEmail: ACTOR });
    const results = await Promise.all([
      saveGroup({ group: "stats", expectedVersion: 1, data: statsData(10), actorEmail: "a@school.pk" }),
      saveGroup({ group: "stats", expectedVersion: 1, data: statsData(20), actorEmail: "b@school.pk" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, error: "conflict" }]);
  });

  it("two first saves racing at version 0: exactly one succeeds", async () => {
    const { saveGroup } = await api();
    const results = await Promise.all([
      saveGroup({ group: "stats", expectedVersion: 0, data: statsData(10), actorEmail: "a@school.pk" }),
      saveGroup({ group: "stats", expectedVersion: 0, data: statsData(20), actorEmail: "b@school.pk" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, error: "conflict" }]);
  });

  it("invalid data is refused with field errors and nothing is written", async () => {
    const { saveGroup } = await api();
    const result = await saveGroup({ group: "stats", expectedVersion: 0, data: { ...statsData(), students: -5 }, actorEmail: ACTOR });
    expect(result).toMatchObject({ ok: false, error: "invalid", fields: { students: settingsCopy.errors.wholeNumber } });

    const { Settings } = await import("@/models/settings");
    expect(await Settings.findById("stats").lean()).toBeNull();
  });

  it("only images that are new since the stored version are verified", async () => {
    const { saveGroup } = await api();
    const first = heroWith("a");
    await saveGroup({ group: "hero", expectedVersion: 0, data: first, actorEmail: ACTOR });
    expect(verifyUploadedImage).toHaveBeenCalledTimes(1);
    expect(verifyUploadedImage).toHaveBeenCalledWith("settings/hero/a", "settings/hero");

    verifyUploadedImage.mockClear();
    const second = { ...first, slides: [...first.slides, ...heroWith("b").slides] };
    await saveGroup({ group: "hero", expectedVersion: 1, data: second, actorEmail: ACTOR });
    expect(verifyUploadedImage).toHaveBeenCalledTimes(1);
    expect(verifyUploadedImage).toHaveBeenCalledWith("settings/hero/b", "settings/hero");
  });

  it.each(["too_large", "bad_format", "wrong_folder"] as const)(
    "a %s image is refused with the limit message, nothing is stored and the asset is removed",
    async (reason) => {
      verifyUploadedImage.mockResolvedValue({ ok: false, reason });
      const { saveGroup } = await api();
      const result = await saveGroup({ group: "hero", expectedVersion: 0, data: heroWith("bad"), actorEmail: ACTOR });
      expect(result).toMatchObject({ ok: false, error: "image_rejected", fields: { "slides.0.desktop": settingsCopy.errors.imageLimits } });
      expect(deleteUploadedImage).toHaveBeenCalledWith("settings/hero/bad");

      const { Settings } = await import("@/models/settings");
      expect(await Settings.findById("hero").lean()).toBeNull();
    },
  );

  it("an unavailable verification is reported as unavailable, storing nothing", async () => {
    verifyUploadedImage.mockResolvedValue({ ok: false, reason: "unavailable" });
    const { saveGroup } = await api();
    const result = await saveGroup({ group: "hero", expectedVersion: 0, data: heroWith("x"), actorEmail: ACTOR });
    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(deleteUploadedImage).not.toHaveBeenCalled();
  });

  it("placeholder images (empty publicId) are never sent to verification", async () => {
    const { saveGroup } = await api();
    const defaults = defaultsFor(GROUPS.hero);
    const result = await saveGroup({ group: "hero", expectedVersion: 0, data: defaults, actorEmail: ACTOR });
    expect(result).toMatchObject({ ok: true, version: 1 });
    expect(verifyUploadedImage).not.toHaveBeenCalled();
  });

  it("a hero payload with every slide hidden is refused and the stored group is unchanged (last visible slide)", async () => {
    const { saveGroup } = await api();
    const keep = slide();
    await saveGroup({ group: "hero", expectedVersion: 0, data: { displaySeconds: 5, slides: [keep] }, actorEmail: ACTOR });

    const hidden = await saveGroup({
      group: "hero",
      expectedVersion: 1,
      data: { displaySeconds: 5, slides: [{ ...keep, visible: false }] },
      actorEmail: ACTOR,
    });
    expect(hidden).toMatchObject({ ok: false, error: "invalid", fields: { slides: settingsCopy.errors.lastVisibleSlide } });

    const emptied = await saveGroup({ group: "hero", expectedVersion: 1, data: { displaySeconds: 5, slides: [] }, actorEmail: ACTOR });
    expect(emptied).toMatchObject({ ok: false, error: "invalid", fields: { slides: settingsCopy.errors.lastVisibleSlide } });

    const { Settings } = await import("@/models/settings");
    const doc = (await Settings.findById("hero").lean()) as { version: number; data: { slides: { id: string; visible: boolean; deletedAt: unknown }[] } };
    expect(doc.version).toBe(1);
    expect(doc.data.slides).toHaveLength(1);
    expect(doc.data.slides[0]).toMatchObject({ id: keep.id, visible: true, deletedAt: null });
  });

  it("deleting a slide keeps it in the document with deletedAt and hides it from the returned value", async () => {
    const { saveGroup } = await api();
    const a = slide({ alt: "A" });
    const b = slide({ alt: "B" });
    await saveGroup({ group: "hero", expectedVersion: 0, data: { displaySeconds: 5, slides: [a, b] }, actorEmail: ACTOR });

    const result = await saveGroup({ group: "hero", expectedVersion: 1, data: { displaySeconds: 5, slides: [a] }, actorEmail: ACTOR });
    expect(result.ok && (result.data.slides as unknown[]).length).toBe(1);

    const { Settings } = await import("@/models/settings");
    const doc = (await Settings.findById("hero").lean()) as { data: { slides: { id: string; deletedAt: Date | null }[] } };
    const stored = doc.data.slides.find((s) => s.id === b.id);
    expect(stored?.deletedAt).toBeInstanceOf(Date);

    const { getAdminSettings } = await import("./admin");
    const admin = await getAdminSettings("hero");
    expect((admin.data.slides as { id: string }[]).map((s) => s.id)).toEqual([a.id]);
    expect(JSON.stringify(admin.data)).not.toContain("deletedAt");
  });

  it("re-sending a deleted slide's id is refused", async () => {
    const { saveGroup } = await api();
    const a = slide();
    const b = slide();
    await saveGroup({ group: "hero", expectedVersion: 0, data: { displaySeconds: 5, slides: [a, b] }, actorEmail: ACTOR });
    await saveGroup({ group: "hero", expectedVersion: 1, data: { displaySeconds: 5, slides: [a] }, actorEmail: ACTOR });

    const result = await saveGroup({ group: "hero", expectedVersion: 2, data: { displaySeconds: 5, slides: [a, b] }, actorEmail: ACTOR });
    expect(result).toMatchObject({ ok: false, error: "invalid" });
  });

  it("a hero image outside the hero folder is refused", async () => {
    const { saveGroup } = await api();
    const wrongFolder = { displaySeconds: 5, slides: [slide({ desktop: cloudImage("a", "settings/gallery") })] };
    const folder = await saveGroup({ group: "hero", expectedVersion: 0, data: wrongFolder, actorEmail: ACTOR });
    expect(folder).toMatchObject({ ok: false, error: "invalid" });
  });

  it("clearing the home video stores an empty string", async () => {
    const { saveGroup } = await api();
    await saveGroup({ group: "video", expectedVersion: 0, data: { youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" }, actorEmail: ACTOR });
    const cleared = await saveGroup({ group: "video", expectedVersion: 1, data: { youtubeUrl: "" }, actorEmail: ACTOR });
    expect(cleared).toMatchObject({ ok: true, data: { youtubeUrl: "" } });
  });
});

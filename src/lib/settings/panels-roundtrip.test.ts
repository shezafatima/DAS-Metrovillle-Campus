// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { describeWithDb } from "@/test/db";
import { PANELS, PANEL_KEYS } from "./panels";

vi.setConfig({ testTimeout: 180_000, hookTimeout: 120_000 });

vi.mock("@/lib/cloudinary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloudinary")>();
  return { ...actual, verifyUploadedImage: async () => ({ ok: true }), deleteUploadedImage: async () => {} };
});

const OLD_EDITOR = "before-014@school.pk";
const deletedAt = new Date("2026-09-01T10:00:00.000Z");

const heroSlide = (alt: string, name: string, extra: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  desktop: { url: `https://res.cloudinary.com/demo/image/upload/v1/settings/hero/${name}.jpg`, publicId: `settings/hero/${name}`, width: 1920, height: 1080 },
  mobile: null,
  alt,
  heading: `Heading ${alt}`,
  buttonLabel: "Apply",
  buttonLink: "/admission",
  visible: true,
  deletedAt: null,
  ...extra,
});

/** Realistic records as 005/020/013 stored them, before 014. */
const SEED: Record<string, Record<string, unknown>> = {
  contact: {
    phone: "+92 21 1234567",
    email: "info@school.pk",
    address: "Metroville, Karachi",
    officeHours: "Monday to Saturday, 8am to 2pm",
    mapUrl: "https://maps.google.com/?q=metroville",
    social: {
      facebook: "https://facebook.com/school",
      instagram: "https://instagram.com/school",
      youtube: "https://youtube.com/@school",
      tiktok: "https://tiktok.com/@school",
    },
  },
  hero: {
    displaySeconds: 7,
    slides: [heroSlide("One", "one"), heroSlide("Two", "two", { visible: false }), heroSlide("Gone", "gone", { deletedAt })],
  },
  video: { youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" },
  stats: { students: 300001, books: 51, teachers: 14501, campuses: 701 },
  admission: {
    opensOn: "2026-11-01",
    closesOn: "2027-01-31",
    announcement: "Admissions are open for Playgroup to Class 2",
    closedMessage: "Admissions for the new session will open soon",
    classes: [
      { id: randomUUID(), name: "Playgroup", deletedAt: null },
      { id: randomUUID(), name: "Nursery", deletedAt: null },
      { id: randomUUID(), name: "Class 1", deletedAt: null },
      { id: randomUUID(), name: "Class 9", deletedAt },
    ],
  },
};

const collection = () => mongoose.connection.db!.collection("settings");

/** A record without the fields a save is allowed to move. */
const BOOKKEEPING = new Set(["_id", "data", "version", "updatedBy", "updatedAt", "panelSaves", "__v"]);
const otherFields = (doc: Record<string, unknown>) => Object.fromEntries(Object.entries(doc).filter(([key]) => !BOOKKEEPING.has(key)));

describeWithDb("SC-002: saving every panel unchanged leaves every stored value identical", ["settings"], () => {
  beforeEach(async () => {
    await collection().insertMany(
      Object.entries(SEED).map(([group, data]) => ({ _id: group as never, data, version: 3, updatedBy: OLD_EDITOR, updatedAt: deletedAt })),
    );
  });

  it("round-trips every group panel", async () => {
    const before = Object.fromEntries((await collection().find({}).toArray()).map((doc) => [String(doc._id), doc]));
    const { getAdminPanels } = await import("./admin");
    const { savePanel } = await import("./mutations");

    for (const key of PANEL_KEYS) {
      const panel = PANELS[key];
      if (panel.source.kind !== "group") continue;
      const loaded = (await getAdminPanels(panel.source.group, [key]))[key];
      const result = await savePanel({ panel, expectedFingerprint: loaded.fingerprint, data: loaded.data, actorEmail: "roundtrip@school.pk" });
      expect(result, key).toMatchObject({ ok: true });
      expect(result.ok && result.fingerprint, `${key} fingerprint`).toBe(loaded.fingerprint);
    }

    const after = await collection().find({}).toArray();
    expect(after).toHaveLength(Object.keys(SEED).length);
    for (const doc of after) {
      const group = String(doc._id);
      const old = before[group];
      // The stored values, soft-deleted items included, are exactly as they were.
      expect(doc.data, group).toEqual(old.data);
      // Only the bookkeeping moved: one version per panel saved, the editor, the time and the per-panel marker.
      const savedPanels = PANEL_KEYS.filter((k) => PANELS[k].source.kind === "group" && (PANELS[k].source as { group: string }).group === group);
      expect(doc.version, group).toBe(old.version + savedPanels.length);
      expect(doc.updatedBy).toBe("roundtrip@school.pk");
      expect(Object.keys(doc.panelSaves ?? {}).sort()).toEqual([...savedPanels].sort());
      expect(otherFields(doc), `${group}: no other field changed`).toEqual(otherFields(old));
    }
  });
});

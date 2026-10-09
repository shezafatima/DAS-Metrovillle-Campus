// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { Settings } from "@/models/settings";
import { GALLERY_DOC_ID, type GalleryData } from "./types";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const deleteUploadedImage = vi.fn();
vi.mock("@/lib/cloudinary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloudinary")>();
  return { ...actual, deleteUploadedImage: (...args: unknown[]) => deleteUploadedImage(...args) };
});
const logSecurityEvent = vi.fn();
vi.mock("@/lib/log", () => ({ logSecurityEvent: (...args: unknown[]) => logSecurityEvent(...args) }));

const { ensureGalleryMigrated, resetMigrationFlag, isMigrationKnownDone } = await import("./migrate");

function flatImages(live: number, deleted = 0) {
  const item = (name: string, deletedAt: Date | null) => ({
    id: crypto.randomUUID(),
    image: { url: `https://res.cloudinary.com/demo/image/upload/v1/settings/gallery/${name}.jpg`, publicId: `settings/gallery/${name}`, width: 8, height: 6 },
    caption: name,
    deletedAt,
  });
  return [...Array.from({ length: live }, (_, i) => item(`img${i}`, null)), ...Array.from({ length: deleted }, (_, i) => item(`del${i}`, new Date()))];
}

async function seedFlat(live: number, deleted = 0) {
  await Settings.create({ _id: GALLERY_DOC_ID, data: { images: flatImages(live, deleted) }, version: 4, updatedBy: "seed@test" });
}

describeWithDb("ensureGalleryMigrated", ["settings"], () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMigrationFlag();
  });

  it("migrates a flat document in place and logs the counts", async () => {
    await seedFlat(10, 1);
    const result = await ensureGalleryMigrated();
    expect(result).toEqual({ status: "migrated", migrated: 10, notMigrated: 0, albums: 2 });
    const doc = await Settings.findById(GALLERY_DOC_ID).lean();
    expect(doc?.version).toBe(5);
    const data = doc?.data as unknown as GalleryData;
    expect(data.schema).toBe(2);
    expect(data.albums.map((a) => [a.title, a.photos.length])).toEqual([["Gallery", 8], ["Gallery 2", 2]]);
    expect(data.retired).toHaveLength(1);
    expect(data.migration).toMatchObject({ migrated: 10, notMigrated: 0 });
    expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "gallery_migrated", outcome: "migrated=10;not_migrated=0" }));
    expect(isMigrationKnownDone()).toBe(true);
  });

  it("deletes the assets past 48 after the write", async () => {
    await seedFlat(50);
    expect(await ensureGalleryMigrated()).toMatchObject({ migrated: 48, notMigrated: 2, albums: 6 });
    expect(deleteUploadedImage.mock.calls.map((c) => c[0])).toEqual(["settings/gallery/img48", "settings/gallery/img49"]);
  });

  it("is a no-op the second time", async () => {
    await seedFlat(3);
    await ensureGalleryMigrated();
    const before = await Settings.findById(GALLERY_DOC_ID).lean();
    expect(await ensureGalleryMigrated()).toEqual({ status: "already" });
    expect((await Settings.findById(GALLERY_DOC_ID).lean())?.version).toBe(before?.version);
  });

  it("migrates exactly once when two runs race", async () => {
    await seedFlat(50);
    const results = await Promise.all([ensureGalleryMigrated(), ensureGalleryMigrated()]);
    expect(results.filter((r) => r.status === "migrated")).toHaveLength(1);
    expect(deleteUploadedImage).toHaveBeenCalledTimes(2);
    expect((await Settings.findById(GALLERY_DOC_ID).lean())?.version).toBe(5);
  });

  it("leaves a missing document missing", async () => {
    expect(await ensureGalleryMigrated()).toEqual({ status: "none" });
    expect(await Settings.findById(GALLERY_DOC_ID).lean()).toBeNull();
  });
});

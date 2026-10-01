// @vitest-environment node
import { expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { Settings } from "@/models/settings";
import { applyCreateAlbum, emptyGallery } from "./rules";
import { GalleryNotMigratedError, readGallery, writeWithRetry } from "./store";
import { GALLERY_DOC_ID } from "./types";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const ACTOR = "admin@school.pk";
const create = (title: string) => (data: Parameters<typeof applyCreateAlbum>[0]) =>
  applyCreateAlbum(data, { title, description: "", date: null }, new Date());

describeWithDb("gallery store (compare-and-set writer)", ["settings"], () => {
  it("reads a missing document as an empty gallery at version 0", async () => {
    expect(await readGallery()).toEqual({ data: emptyGallery(), version: 0 });
  });

  it("inserts at version 1, then compare-and-sets", async () => {
    expect((await writeWithRetry(create("A"), { actorEmail: ACTOR })).ok).toBe(true);
    let doc = await Settings.findById(GALLERY_DOC_ID).lean();
    expect(doc).toMatchObject({ version: 1, updatedBy: ACTOR });
    await writeWithRetry(create("B"), { actorEmail: ACTOR });
    doc = await Settings.findById(GALLERY_DOC_ID).lean();
    expect(doc?.version).toBe(2);
    expect((await readGallery()).data.albums.map((a) => a.title)).toEqual(["A", "B"]);
  });

  it("writes nothing when the change is refused", async () => {
    const result = await writeWithRetry(() => ({ ok: false, error: "full" }), { actorEmail: ACTOR });
    expect(result).toEqual({ ok: false, error: "full" });
    expect(await Settings.findById(GALLERY_DOC_ID).lean()).toBeNull();
  });

  it("re-reads and re-applies after losing a race", async () => {
    await writeWithRetry(create("A"), { actorEmail: ACTOR });
    let calls = 0;
    const result = await writeWithRetry(
      (data) => {
        calls += 1;
        if (calls === 1) {
          // Another admin writes between this read and this write.
          void Settings.updateOne({ _id: GALLERY_DOC_ID }, { $inc: { version: 1 } }).exec();
        }
        return create("B")(data);
      },
      { actorEmail: ACTOR },
    );
    expect(result.ok).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(1);
    expect((await readGallery()).data.albums.map((a) => a.title)).toEqual(["A", "B"]);
  });

  it("returns unavailable after the attempts run out", async () => {
    await writeWithRetry(create("A"), { actorEmail: ACTOR });
    const result = await writeWithRetry(
      (data) => {
        // Every attempt loses: the version moves after each read.
        return { ...create("B")(data), data: { ...data } } as ReturnType<ReturnType<typeof create>>;
      },
      { actorEmail: ACTOR, attempts: 0 },
    );
    expect(result).toEqual({ ok: false, error: "unavailable" });
  });

  it("holds the 6-album cap when 10 creates race", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => writeWithRetry(create(`Album ${i}`), { actorEmail: ACTOR })));
    const ok = results.filter((r) => r.ok).length;
    const full = results.filter((r) => !r.ok && r.error === "full").length;
    expect(ok).toBe(6);
    expect(full).toBe(4);
    expect((await readGallery()).data.albums).toHaveLength(6);
  });

  it("refuses to read the old flat shape", async () => {
    await Settings.create({ _id: GALLERY_DOC_ID, data: { images: [] }, version: 1, updatedBy: ACTOR });
    await expect(readGallery()).rejects.toBeInstanceOf(GalleryNotMigratedError);
  });
});

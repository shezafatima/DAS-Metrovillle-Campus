import { describe, expect, it } from "vitest";
import { migrateFlatGallery } from "./migrate";
import { emptyGallery } from "./rules";

const NOW = new Date("2026-09-30T10:00:00Z");

function flat(live: number, deleted = 0) {
  const item = (name: string, deletedAt: Date | null) => ({
    id: crypto.randomUUID(),
    image: { url: `https://res.cloudinary.com/demo/image/upload/v1/settings/gallery/${name}.jpg`, publicId: `settings/gallery/${name}`, width: 8, height: 6 },
    caption: `caption ${name}`,
    deletedAt,
  });
  return {
    images: [
      ...Array.from({ length: deleted }, (_, i) => item(`del${i}`, NOW)),
      ...Array.from({ length: live }, (_, i) => item(`img${i}`, null)),
    ],
  };
}

describe("migrateFlatGallery", () => {
  it("makes no albums from an empty gallery", () => {
    const out = migrateFlatGallery({ images: [] }, NOW);
    expect(out.data.albums).toEqual([]);
    expect(out).toMatchObject({ migrated: 0, notMigrated: 0, alreadyMigrated: false });
  });

  it("puts 5 photos in one 'Gallery' album, order and captions kept, default cover", () => {
    const old = flat(5);
    const out = migrateFlatGallery(old, NOW);
    expect(out.data.albums).toHaveLength(1);
    expect(out.data.albums[0]).toMatchObject({ title: "Gallery", coverPhotoId: null, rev: 1 });
    expect(out.data.albums[0].photos.map((p) => p.caption)).toEqual(old.images.map((i) => i.caption));
    expect(out.data.albums[0].photos.map((p) => p.id)).toEqual(old.images.map((i) => i.id));
  });

  it("spills into 'Gallery 2' after 8", () => {
    const out = migrateFlatGallery(flat(9), NOW);
    expect(out.data.albums.map((a) => [a.title, a.photos.length])).toEqual([["Gallery", 8], ["Gallery 2", 1]]);
  });

  it("fills 6 albums with exactly 48", () => {
    const out = migrateFlatGallery(flat(48), NOW);
    expect(out.data.albums.map((a) => a.title)).toEqual(["Gallery", "Gallery 2", "Gallery 3", "Gallery 4", "Gallery 5", "Gallery 6"]);
    expect(out).toMatchObject({ migrated: 48, notMigrated: 0, discardedPublicIds: [] });
  });

  it("does not migrate photos past 48 and reports them", () => {
    const out = migrateFlatGallery(flat(50), NOW);
    expect(out.data.albums).toHaveLength(6);
    expect(out).toMatchObject({ migrated: 48, notMigrated: 2 });
    expect(out.discardedPublicIds).toEqual(["settings/gallery/img48", "settings/gallery/img49"]);
    expect(out.data.migration).toMatchObject({ migrated: 48, notMigrated: 2 });
  });

  it("keeps already-deleted photos retired, not in albums, and not counted", () => {
    const out = migrateFlatGallery(flat(48, 3), NOW);
    expect(out.data.retired).toHaveLength(3);
    expect(out.data.albums.flatMap((a) => a.photos)).toHaveLength(48);
    expect(out.notMigrated).toBe(0);
  });

  it("leaves schema 2 data unchanged", () => {
    const already = emptyGallery();
    const out = migrateFlatGallery(already, NOW);
    expect(out.alreadyMigrated).toBe(true);
    expect(out.data).toBe(already);
  });
});

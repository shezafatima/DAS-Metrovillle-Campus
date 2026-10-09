import { describe, expect, it } from "vitest";
import {
  applyAddPhotos,
  applyCreateAlbum,
  applyDeleteAlbum,
  applyDeletePhoto,
  applyReorderAlbums,
  applyReorderPhotos,
  applySetCover,
  applyUpdateAlbum,
  applyUpdatePhoto,
  effectiveCover,
  emptyGallery,
  enforceRetention,
  liveAlbums,
  livePhotos,
  newAlbumId,
  toAdminGallery,
  toPublicGallery,
  type NewPhoto,
} from "./rules";
import { ALBUM_ID_PATTERN, type Album, type GalleryData, type Photo } from "./types";

const NOW = new Date("2026-09-30T10:00:00Z");
const details = (title = "Annual Day") => ({ title, description: "", date: null });

function img(name: string) {
  return { url: `https://res.cloudinary.com/demo/image/upload/v1/settings/gallery/${name}.jpg`, publicId: `settings/gallery/${name}`, width: 800, height: 600 };
}
function photo(name: string, deletedAt: Date | null = null): Photo {
  return { id: crypto.randomUUID(), image: img(name), caption: "", deletedAt };
}
function newPhotos(n: number, prefix = "p"): NewPhoto[] {
  return Array.from({ length: n }, (_, i) => ({ id: crypto.randomUUID(), image: img(`${prefix}${i}`), caption: `c${i}` }));
}
function album(id: string, photos: Photo[] = [], o: Partial<Album> = {}): Album {
  return { id, title: `Album ${id}`, description: "", date: null, coverPhotoId: null, photos, rev: 1, createdAt: NOW, deletedAt: null, ...o };
}
function gallery(albums: Album[]): GalleryData {
  return { ...emptyGallery(), albums };
}
function unwrap<T>(result: ReturnType<typeof applyCreateAlbum> | { ok: boolean }): T {
  if (!result.ok) throw new Error(`expected ok, got ${(result as { error: string }).error}`);
  return result as unknown as T;
}

describe("live filters and cover", () => {
  it("ignores deleted albums and photos", () => {
    const data = gallery([album("aaaaaaaaaaaa", [photo("a"), photo("b", NOW)]), album("bbbbbbbbbbbb", [], { deletedAt: NOW })]);
    expect(liveAlbums(data).map((a) => a.id)).toEqual(["aaaaaaaaaaaa"]);
    expect(livePhotos(data.albums[0]).length).toBe(1);
  });

  it("uses the chosen cover when live, else the first live photo, else none", () => {
    const [a, b] = [photo("a"), photo("b")];
    expect(effectiveCover(album("x", [a, b], { coverPhotoId: b.id }))?.id).toBe(b.id);
    expect(effectiveCover(album("x", [a, { ...b, deletedAt: NOW }], { coverPhotoId: b.id }))?.id).toBe(a.id);
    expect(effectiveCover(album("x", [a, b]))?.id).toBe(a.id);
    expect(effectiveCover(album("x", []))).toBeNull();
  });
});

describe("newAlbumId", () => {
  it("is 12 characters of [a-z0-9] and unique", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      const id = newAlbumId(ids);
      expect(id).toMatch(ALBUM_ID_PATTERN);
      ids.add(id);
    }
    expect(ids.size).toBe(1000);
  });
});

describe("albums", () => {
  it("creates at the end with rev 1 and no photos", () => {
    const r = applyCreateAlbum(gallery([album("aaaaaaaaaaaa")]), details("New"), NOW);
    const { data, value } = unwrap<{ data: GalleryData; value: string }>(r);
    expect(data.albums.at(-1)).toMatchObject({ id: value, title: "New", rev: 1, photos: [], deletedAt: null });
  });

  it("refuses a 7th live album, but a deleted one frees a slot", () => {
    const six = gallery(Array.from({ length: 6 }, (_, i) => album(`a${i}`.padEnd(12, "0"))));
    expect(applyCreateAlbum(six, details(), NOW)).toEqual({ ok: false, error: "full" });
    six.albums[2].deletedAt = NOW;
    expect(applyCreateAlbum(six, details(), NOW).ok).toBe(true);
  });

  it("refuses a stale rev and bumps rev on a matching one", () => {
    const data = gallery([album("aaaaaaaaaaaa", [], { rev: 3 })]);
    expect(applyUpdateAlbum(data, "aaaaaaaaaaaa", 2, details("X"))).toEqual({ ok: false, error: "conflict" });
    const r = unwrap<{ data: GalleryData }>(applyUpdateAlbum(data, "aaaaaaaaaaaa", 3, details("X")));
    expect(r.data.albums[0]).toMatchObject({ title: "X", rev: 4 });
    expect(data.albums[0].title).toBe("Album aaaaaaaaaaaa"); // input untouched
  });

  it("reorders only with exactly the live set", () => {
    const data = gallery([album("aaaaaaaaaaaa"), album("bbbbbbbbbbbb"), album("cccccccccccc", [], { deletedAt: NOW })]);
    expect(applyReorderAlbums(data, ["aaaaaaaaaaaa"])).toEqual({ ok: false, error: "invalid" });
    expect(applyReorderAlbums(data, ["aaaaaaaaaaaa", "aaaaaaaaaaaa"])).toEqual({ ok: false, error: "invalid" });
    const r = unwrap<{ data: GalleryData }>(applyReorderAlbums(data, ["bbbbbbbbbbbb", "aaaaaaaaaaaa"]));
    expect(r.data.albums.map((a) => a.id)).toEqual(["bbbbbbbbbbbb", "aaaaaaaaaaaa", "cccccccccccc"]);
  });

  it("delete is soft and frees the slot; unknown album is not_found", () => {
    const r = unwrap<{ data: GalleryData }>(applyDeleteAlbum(gallery([album("aaaaaaaaaaaa")]), "aaaaaaaaaaaa", NOW));
    expect(r.data.albums[0].deletedAt).toEqual(NOW);
    expect(liveAlbums(r.data)).toEqual([]);
    expect(applyDeleteAlbum(r.data, "aaaaaaaaaaaa", NOW)).toEqual({ ok: false, error: "not_found" });
  });
});

describe("photos", () => {
  it("keeps the ones that fit, in order, and refuses the rest", () => {
    const data = gallery([album("aaaaaaaaaaaa", Array.from({ length: 5 }, (_, i) => photo(`old${i}`)))]);
    const incoming = newPhotos(6);
    const r = applyAddPhotos(data, "aaaaaaaaaaaa", incoming);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.added).toBe(3);
    expect(r.value.refusedFull.map((p) => p.id)).toEqual(incoming.slice(3).map((p) => p.id));
    expect(r.discardedPublicIds).toEqual(incoming.slice(3).map((p) => p.image.publicId));
    expect(livePhotos(r.data.albums[0]).map((p) => p.id).slice(5)).toEqual(incoming.slice(0, 3).map((p) => p.id));
  });

  it("returns full when there is no room, and deleted photos do not count", () => {
    const eight = gallery([album("aaaaaaaaaaaa", Array.from({ length: 8 }, (_, i) => photo(`x${i}`)))]);
    expect(applyAddPhotos(eight, "aaaaaaaaaaaa", newPhotos(1))).toEqual({ ok: false, error: "full" });
    eight.albums[0].photos[0].deletedAt = NOW;
    const r = applyAddPhotos(eight, "aaaaaaaaaaaa", newPhotos(2));
    if (!r.ok) throw new Error(r.error);
    expect(r.value.added).toBe(1);
  });

  it("deleting the cover promotes the next photo", () => {
    const [a, b] = [photo("a"), photo("b")];
    const data = gallery([album("aaaaaaaaaaaa", [a, b], { coverPhotoId: a.id })]);
    const r = unwrap<{ data: GalleryData }>(applyDeletePhoto(data, "aaaaaaaaaaaa", a.id, NOW));
    expect(r.data.albums[0].coverPhotoId).toBeNull();
    expect(effectiveCover(r.data.albums[0])?.id).toBe(b.id);
  });

  it("captions, reorders, sets the cover, and refuses deleted photos", () => {
    const [a, b, c] = [photo("a"), photo("b"), photo("c", NOW)];
    const data = gallery([album("aaaaaaaaaaaa", [a, b, c])]);
    expect(unwrap<{ data: GalleryData }>(applyUpdatePhoto(data, "aaaaaaaaaaaa", a.id, "Hi")).data.albums[0].photos[0].caption).toBe("Hi");
    expect(applyReorderPhotos(data, "aaaaaaaaaaaa", [a.id])).toEqual({ ok: false, error: "invalid" });
    const re = unwrap<{ data: GalleryData }>(applyReorderPhotos(data, "aaaaaaaaaaaa", [b.id, a.id]));
    expect(re.data.albums[0].photos.map((p) => p.id)).toEqual([b.id, a.id, c.id]);
    expect(applySetCover(data, "aaaaaaaaaaaa", c.id)).toEqual({ ok: false, error: "not_found" });
    expect(unwrap<{ data: GalleryData }>(applySetCover(data, "aaaaaaaaaaaa", b.id)).data.albums[0].coverPhotoId).toBe(b.id);
  });
});

describe("retention", () => {
  it("keeps at most 50 deleted albums and 200 deleted photos, oldest dropped first", () => {
    const albums: Album[] = Array.from({ length: 52 }, (_, i) =>
      album(`d${String(i).padStart(11, "0")}`, [photo(`da${i}`)], { deletedAt: new Date(NOW.getTime() + i * 1000) }),
    );
    const r = enforceRetention(gallery(albums));
    expect(r.data.albums.length).toBe(50);
    expect(r.discardedPublicIds).toEqual(["settings/gallery/da0", "settings/gallery/da1"]);

    const many = album("aaaaaaaaaaaa", Array.from({ length: 202 }, (_, i) => photo(`dp${i}`, new Date(NOW.getTime() + i * 1000))));
    const r2 = enforceRetention(gallery([many]));
    expect(r2.data.albums[0].photos.length).toBe(200);
    expect(r2.discardedPublicIds).toEqual(["settings/gallery/dp0", "settings/gallery/dp1"]);
  });
});

describe("views", () => {
  it("public view hides empty and deleted albums and deleted photos", () => {
    const data = gallery([
      album("aaaaaaaaaaaa", [photo("a"), photo("gone", NOW)]),
      album("bbbbbbbbbbbb", []),
      album("cccccccccccc", [photo("c")], { deletedAt: NOW }),
    ]);
    const pub = toPublicGallery(data);
    expect(pub.albums.map((a) => a.id)).toEqual(["aaaaaaaaaaaa"]);
    expect(pub.albums[0]).toMatchObject({ photoCount: 1 });
    expect(JSON.stringify(pub)).not.toMatch(/deletedAt|rev|retired/);
    expect(toAdminGallery(data).albums.map((a) => a.id)).toEqual(["aaaaaaaaaaaa", "bbbbbbbbbbbb"]);
  });
});

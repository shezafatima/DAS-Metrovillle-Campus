// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const logSecurityEvent = vi.fn();

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/db", () => ({ connectDb: async () => undefined }));
vi.mock("@/lib/log", () => ({ logSecurityEvent: (...args: unknown[]) => logSecurityEvent(...args) }));
vi.mock("@/models/settings", () => ({
  Settings: {
    findById: (...args: unknown[]) => ({ lean: () => findById(...args) }),
    findOneAndUpdate: () => ({ lean: async () => null }),
  },
}));

function image(name: string) {
  return { url: `https://res.cloudinary.com/demo/image/upload/v1/settings/gallery/${name}.jpg`, publicId: `settings/gallery/${name}`, width: 8, height: 6 };
}
function photo(id: string, deletedAt: Date | null = null) {
  return { id, image: image(id), caption: `caption ${id}`, deletedAt };
}
function album(id: string, photos: ReturnType<typeof photo>[], o: Record<string, unknown> = {}) {
  return { id, title: `Album ${id}`, description: "", date: null, coverPhotoId: null, photos, rev: 3, createdAt: new Date(), deletedAt: null, ...o };
}
function doc(albums: ReturnType<typeof album>[]) {
  return { data: { schema: 2, albums, retired: [{ id: "r", image: image("r"), caption: "", deletedAt: new Date() }] }, version: 4, updatedBy: "x" };
}

async function load() {
  vi.resetModules();
  return import("./public");
}

beforeEach(() => {
  findById.mockReset();
  logSecurityEvent.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("getPublicGallery: what the site may see", () => {
  it("only live albums with live photos, in order, without revs, deletions or retired images", async () => {
    findById.mockResolvedValue(
      doc([
        album("aaaaaaaaaaaa", [photo("p1"), photo("gone", new Date()), photo("p2")]),
        album("bbbbbbbbbbbb", []),
        album("cccccccccccc", [photo("p3")], { deletedAt: new Date() }),
        album("dddddddddddd", [photo("p4")]),
      ]),
    );
    const { getPublicGallery } = await load();
    const gallery = await getPublicGallery();
    expect(gallery.albums.map((a) => a.id)).toEqual(["aaaaaaaaaaaa", "dddddddddddd"]);
    expect(gallery.albums[0]).toMatchObject({ photoCount: 2, cover: image("p1") });
    expect(gallery.albums[0].photos.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(JSON.stringify(gallery)).not.toMatch(/deletedAt|"rev"|retired|updatedBy/);
  });

  it("getPublicAlbum: null for a bad format, unknown, deleted or empty album", async () => {
    findById.mockResolvedValue(doc([album("aaaaaaaaaaaa", [photo("p1")]), album("bbbbbbbbbbbb", []), album("cccccccccccc", [photo("x")], { deletedAt: new Date() })]));
    const { getPublicAlbum } = await load();
    expect(await getPublicAlbum("aaaaaaaaaaaa")).toMatchObject({ id: "aaaaaaaaaaaa" });
    for (const id of ["AAAA", "../etc", "zzzzzzzzzzzz", "bbbbbbbbbbbb", "cccccccccccc"]) expect(await getPublicAlbum(id)).toBeNull();
  });

  it("a failed read returns the last good value, else an empty gallery, never throws, and logs", async () => {
    const { getPublicGallery } = await load();
    findById.mockRejectedValue(new Error("down"));
    await expect(getPublicGallery()).resolves.toEqual({ albums: [] });
    expect(logSecurityEvent).toHaveBeenCalledWith({ type: "gallery_read_failed", group: "gallery" });

    findById.mockResolvedValue(doc([album("aaaaaaaaaaaa", [photo("p1")])]));
    const good = await getPublicGallery();
    expect(good.albums).toHaveLength(1);

    findById.mockRejectedValue(new Error("down again"));
    expect(await getPublicGallery()).toEqual(good);
  });

  it("a read slower than 3 s falls back", async () => {
    vi.useFakeTimers();
    findById.mockImplementation(() => new Promise(() => {}));
    const { getPublicGallery } = await load();
    const pending = getPublicGallery();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await pending).toEqual({ albums: [] });
  });

  it("a failed read is not cached: the next read after recovery returns real values", async () => {
    const { getPublicGallery } = await load();
    findById.mockRejectedValueOnce(new Error("blip"));
    expect(await getPublicGallery()).toEqual({ albums: [] });
    findById.mockResolvedValue(doc([album("aaaaaaaaaaaa", [photo("p1")])]));
    expect((await getPublicGallery()).albums).toHaveLength(1);
  });

  it("the migration check reads the database at most once per process", async () => {
    findById.mockResolvedValue(doc([album("aaaaaaaaaaaa", [photo("p1")])]));
    const { getPublicGallery } = await load();
    await getPublicGallery(); // first call: migration check (1 read) + gallery read (1 read)
    const afterFirst = findById.mock.calls.length;
    expect(afterFirst).toBe(2);
    for (let i = 0; i < 10; i += 1) await getPublicGallery();
    // unstable_cache is mocked to call through, so each call still does the one gallery read,
    // but never the migration check again.
    expect(findById.mock.calls.length).toBe(afterFirst + 10);
  });
});

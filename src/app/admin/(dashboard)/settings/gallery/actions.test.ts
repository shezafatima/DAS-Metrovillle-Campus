// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { PERMISSION_KEYS } from "@/lib/permissions";
import type { GalleryData } from "@/lib/gallery/types";

// Real Better Auth against a remote test database: the first case pays for
// module loading and index creation.
vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

const PASSWORD = "correct-horse-battery-staple";
const ADMIN_EMAIL = "gallery-admin@example.test";
const CM_EMAIL = "gallery-manager@example.test";

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();
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

type Actions = typeof import("./actions");
type ActionName = keyof Actions;

async function actions(cookie: string | null): Promise<Actions> {
  vi.doMock("next/headers", () => mockNextHeaders(new Headers(cookie ? { cookie } : {})));
  vi.doMock("next/cache", () => ({ revalidatePath, revalidateTag, unstable_cache: (fn: unknown) => fn }));
  vi.resetModules();
  return import("./actions");
}

async function run(cookie: string | null, name: ActionName, input: unknown) {
  const all = await actions(cookie);
  return (all[name] as (input: unknown) => Promise<unknown>)(input);
}

const ALBUM = "aaaaaaaaaaaa";
const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";

function image(name: string) {
  return { url: `https://res.cloudinary.com/demo/image/upload/v1/settings/gallery/${name}.jpg`, publicId: `settings/gallery/${name}`, width: 800, height: 600 };
}

function albumDoc(id: string, title: string, photos: { id: string; name: string }[] = []) {
  return {
    id,
    title,
    description: "",
    date: null,
    coverPhotoId: null,
    rev: 1,
    createdAt: new Date(),
    deletedAt: null,
    photos: photos.map((p) => ({ id: p.id, image: image(p.name), caption: "", deletedAt: null })),
  };
}

async function db() {
  return (await import("mongoose")).default.connection.db!;
}

async function seedGallery(albums: ReturnType<typeof albumDoc>[], version = 1) {
  const data: GalleryData = { schema: 2, albums, retired: [] };
  await (await db()).collection("settings").replaceOne(
    { _id: "gallery" as never },
    { _id: "gallery" as never, data, version, updatedBy: "seed@test", updatedAt: new Date() },
    { upsert: true },
  );
}

async function stored(): Promise<{ data: GalleryData; version: number } | null> {
  const doc = await (await db()).collection("settings").findOne({ _id: "gallery" as never });
  return doc ? { data: doc.data as GalleryData, version: doc.version as number } : null;
}

/** A valid input for every action, against the seeded album with photos P1 and P2. */
const VALID: Record<ActionName, unknown> = {
  createGalleryAlbum: { title: "Sports Day" },
  updateGalleryAlbum: { albumId: ALBUM, rev: 1, title: "Renamed" },
  reorderGalleryAlbums: { albumIds: [ALBUM] },
  deleteGalleryAlbum: { albumId: ALBUM },
  addGalleryPhotos: { albumId: ALBUM, photos: [{ image: image("new") }] },
  updateGalleryPhoto: { albumId: ALBUM, photoId: P1, caption: "Hello" },
  reorderGalleryPhotos: { albumId: ALBUM, photoIds: [P2, P1] },
  setGalleryCover: { albumId: ALBUM, photoId: P2 },
  deleteGalleryPhoto: { albumId: ALBUM, photoId: P1 },
};
const NAMES = Object.keys(VALID) as ActionName[];

const seedDefault = () => seedGallery([albumDoc(ALBUM, "Annual Day", [{ id: P1, name: "p1" }, { id: P2, name: "p2" }])]);

async function signIn(kind: "admin" | "cm-with" | "cm-without"): Promise<string> {
  if (kind === "admin") {
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    return getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
  }
  await seedTestContentManager(CM_EMAIL, PASSWORD, kind === "cm-with" ? ["settings"] : PERMISSION_KEYS.filter((key) => key !== "settings"));
  return getTestSessionCookie(CM_EMAIL, PASSWORD);
}

describeWithDb("gallery actions: the three access cases (Constitution XI) and behaviour", ["user", "account", "session", "settings", "throttles"], () => {
  beforeEach(() => {
    vi.doUnmock("next/headers");
    vi.doUnmock("next/cache");
    vi.resetModules();
    revalidateTag.mockClear();
    revalidatePath.mockClear();
    verifyUploadedImage.mockReset().mockResolvedValue({ ok: true });
    deleteUploadedImage.mockReset().mockResolvedValue(undefined);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  for (const name of NAMES) {
    it(`${name}: no session → unauthorized, nothing changes`, async () => {
      await seedDefault();
      const before = await stored();
      expect(await run(null, name, VALID[name])).toEqual({ status: "error", error: "unauthorized" });
      expect(await stored()).toEqual(before);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it(`${name}: a content manager without settings → forbidden, nothing changes, access_denied logged`, async () => {
      await seedDefault();
      const cookie = await signIn("cm-without");
      const info = vi.spyOn(console, "info");
      const before = await stored();
      expect(await run(cookie, name, VALID[name])).toEqual({ status: "error", error: "forbidden" });
      expect(await stored()).toEqual(before);
      expect(info.mock.calls.some(([line]) => String(line).includes('"access_denied"') && String(line).includes('"settings"'))).toBe(true);
    });

    it(`${name}: a content manager with settings → succeeds`, async () => {
      await seedDefault();
      const cookie = await signIn("cm-with");
      expect(await run(cookie, name, VALID[name])).toMatchObject({ status: "success" });
      expect((await stored())?.version).toBe(2);
      expect(revalidateTag).toHaveBeenCalledWith("settings:gallery", { expire: 0 });
      expect(revalidatePath).toHaveBeenCalledWith("/resources");
    });
  }

  // ---------- US1: albums ----------

  it("a main admin creates an album; it is logged by title only", async () => {
    const cookie = await signIn("admin");
    const info = vi.spyOn(console, "info");
    const result = (await run(cookie, "createGalleryAlbum", { title: "Annual Day", description: "SECRET-DESCRIPTION" })) as {
      status: string;
      data: { albums: { title: string; photoCount: number }[] };
    };
    expect(result).toMatchObject({ status: "success", data: { albums: [{ title: "Annual Day", photoCount: 0 }] } });
    const line = info.mock.calls.map(([l]) => String(l)).find((l) => l.includes('"gallery_changed"'));
    expect(line).toContain('"album_created"');
    expect(line).toContain("Annual Day");
    expect(line).not.toContain("SECRET-DESCRIPTION");
  });

  it("the 7th album is refused when called directly", async () => {
    await seedGallery(Array.from({ length: 6 }, (_, i) => albumDoc(`album${i}`.padEnd(12, "x"), `A${i}`)));
    const cookie = await signIn("admin");
    expect(await run(cookie, "createGalleryAlbum", { title: "Seventh" })).toEqual({ status: "error", error: "full" });
    expect((await stored())?.data.albums).toHaveLength(6);
  });

  it("two creates racing at five albums → exactly one succeeds", async () => {
    await seedGallery(Array.from({ length: 5 }, (_, i) => albumDoc(`album${i}`.padEnd(12, "x"), `A${i}`)));
    const cookie = await signIn("admin");
    const all = await actions(cookie);
    const results = await Promise.all([all.createGalleryAlbum({ title: "X" }), all.createGalleryAlbum({ title: "Y" })]);
    expect(results.filter((r) => r.status === "success")).toHaveLength(1);
    expect(results.filter((r) => r.status === "error" && r.error === "full")).toHaveLength(1);
    expect((await stored())?.data.albums).toHaveLength(6);
  });

  it("a stale rev is a conflict and stores nothing", async () => {
    await seedDefault();
    const cookie = await signIn("admin");
    const before = await stored();
    expect(await run(cookie, "updateGalleryAlbum", { albumId: ALBUM, rev: 7, title: "Late" })).toEqual({ status: "error", error: "conflict" });
    expect(await stored()).toEqual(before);
  });

  it("reorder with a missing id is invalid; delete frees the slot", async () => {
    await seedGallery([albumDoc(ALBUM, "One"), albumDoc("bbbbbbbbbbbb", "Two")]);
    const cookie = await signIn("admin");
    expect(await run(cookie, "reorderGalleryAlbums", { albumIds: [ALBUM] })).toMatchObject({ status: "error", error: "invalid" });
    const deleted = (await run(cookie, "deleteGalleryAlbum", { albumId: ALBUM })) as { data: { albums: unknown[] } };
    expect(deleted.data.albums).toHaveLength(1);
    expect((await stored())?.data.albums.find((a) => a.id === ALBUM)?.deletedAt).toBeTruthy();
  });

  it("bad input is invalid with field errors", async () => {
    const cookie = await signIn("admin");
    expect(await run(cookie, "createGalleryAlbum", { title: "   " })).toMatchObject({ status: "error", error: "invalid", fields: { title: expect.any(String) } });
    expect(await stored()).toBeNull();
  });

  // ---------- US2: photos ----------

  it("5 then 6 photos → 3 added, 3 refused and their assets deleted", async () => {
    await seedGallery([albumDoc(ALBUM, "A", Array.from({ length: 5 }, (_, i) => ({ id: crypto.randomUUID(), name: `old${i}` })))]);
    const cookie = await signIn("admin");
    const photos = Array.from({ length: 6 }, (_, i) => ({ image: image(`new${i}`) }));
    const result = (await run(cookie, "addGalleryPhotos", { albumId: ALBUM, photos })) as { status: string; data: { added: number; refusedFull: number } };
    expect(result).toMatchObject({ status: "success", data: { added: 3, refusedFull: 3 } });
    expect(deleteUploadedImage.mock.calls.map((c) => c[0])).toEqual(["settings/gallery/new3", "settings/gallery/new4", "settings/gallery/new5"]);
    const album = (await stored())!.data.albums[0];
    expect(album.photos.map((p) => p.image.publicId).slice(5)).toEqual(["settings/gallery/new0", "settings/gallery/new1", "settings/gallery/new2"]);
  });

  it("the 9th photo is refused when called directly, and its asset deleted", async () => {
    await seedGallery([albumDoc(ALBUM, "A", Array.from({ length: 8 }, (_, i) => ({ id: crypto.randomUUID(), name: `x${i}` })))]);
    const cookie = await signIn("admin");
    expect(await run(cookie, "addGalleryPhotos", { albumId: ALBUM, photos: [{ image: image("ninth") }] })).toEqual({ status: "error", error: "full" });
    expect(deleteUploadedImage).toHaveBeenCalledWith("settings/gallery/ninth");
    expect((await stored())!.data.albums[0].photos).toHaveLength(8);
  });

  it("two 5-photo uploads racing into an empty album → 8 stored in total", async () => {
    await seedGallery([albumDoc(ALBUM, "A")]);
    const cookie = await signIn("admin");
    const all = await actions(cookie);
    const batch = (p: string) => ({ albumId: ALBUM, photos: Array.from({ length: 5 }, (_, i) => ({ image: image(`${p}${i}`) })) });
    const results = await Promise.all([all.addGalleryPhotos(batch("a")), all.addGalleryPhotos(batch("b"))]);
    const added = results.reduce((sum, r) => sum + (r.status === "success" ? r.data.added : 0), 0);
    expect(added).toBe(8);
    expect((await stored())!.data.albums[0].photos).toHaveLength(8);
    expect(deleteUploadedImage).toHaveBeenCalledTimes(2);
  });

  it("a rejected image is listed; the others are added", async () => {
    await seedGallery([albumDoc(ALBUM, "A")]);
    verifyUploadedImage.mockImplementation(async (publicId: string) => (publicId.endsWith("bad") ? { ok: false, reason: "bad_format" } : { ok: true }));
    const cookie = await signIn("admin");
    const result = (await run(cookie, "addGalleryPhotos", { albumId: ALBUM, photos: [{ image: image("good") }, { image: image("bad") }] })) as {
      data: { added: number; rejected: unknown[] };
    };
    expect(result.data).toMatchObject({ added: 1, rejected: [{ index: 1, reason: "image" }] });
    expect(deleteUploadedImage).toHaveBeenCalledWith("settings/gallery/bad");
  });

  it("Cloudinary unreachable → unavailable, nothing stored", async () => {
    await seedGallery([albumDoc(ALBUM, "A")]);
    verifyUploadedImage.mockResolvedValue({ ok: false, reason: "unavailable" });
    const cookie = await signIn("admin");
    const before = await stored();
    expect(await run(cookie, "addGalleryPhotos", { albumId: ALBUM, photos: [{ image: image("x") }] })).toEqual({ status: "error", error: "unavailable" });
    expect(await stored()).toEqual(before);
  });

  it("deleting the cover promotes the next photo; a deleted photo cannot be the cover", async () => {
    await seedDefault();
    const cookie = await signIn("admin");
    await run(cookie, "setGalleryCover", { albumId: ALBUM, photoId: P1 });
    const after = (await run(cookie, "deleteGalleryPhoto", { albumId: ALBUM, photoId: P1 })) as { data: { coverPhotoId: string } };
    expect(after.data.coverPhotoId).toBe(P2);
    expect(await run(cookie, "setGalleryCover", { albumId: ALBUM, photoId: P1 })).toEqual({ status: "error", error: "not_found" });
  });

  it("a 151-character caption is invalid", async () => {
    await seedDefault();
    const cookie = await signIn("admin");
    expect(await run(cookie, "updateGalleryPhoto", { albumId: ALBUM, photoId: P1, caption: "x".repeat(151) })).toMatchObject({
      status: "error",
      error: "invalid",
      fields: { caption: expect.any(String) },
    });
  });
});

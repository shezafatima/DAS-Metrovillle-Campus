import { moveItem } from "@/lib/settings/items";
import {
  ALBUM_ID_PATTERN,
  GALLERY_SCHEMA,
  MAX_ALBUMS,
  MAX_DELETED_ALBUMS,
  MAX_DELETED_PHOTOS,
  MAX_PHOTOS_PER_ALBUM,
  type AdminAlbum,
  type AdminGallery,
  type Album,
  type GalleryData,
  type ImageRef,
  type Photo,
  type PublicAlbum,
  type PublicGallery,
} from "./types";

/**
 * Pure gallery rules (007). Every change to the gallery is one `apply*`
 * function: it takes the stored data and returns the next data, or the reason
 * the change is refused. The caps are decided here, and store.ts runs them
 * against the latest stored version on every retry, so a cap can never be
 * exceeded by two writers racing (ADR-0005).
 *
 * The functions never mutate their input.
 */

export type RuleError = "full" | "not_found" | "conflict" | "invalid";

export type Applied<T = undefined> =
  | {
      ok: true;
      data: GalleryData;
      value: T;
      /** Cloudinary assets to delete once the write has succeeded. */
      discardedPublicIds: string[];
      /** The album the change was about, for the log line. */
      albumTitle: string;
    }
  | { ok: false; error: RuleError };

export function emptyGallery(): GalleryData {
  return { schema: GALLERY_SCHEMA, albums: [], retired: [] };
}

export function liveAlbums(data: GalleryData): Album[] {
  return data.albums.filter((album) => !album.deletedAt);
}

export function livePhotos(album: Album): Photo[] {
  return album.photos.filter((photo) => !photo.deletedAt);
}

export function effectiveCover(album: Album): Photo | null {
  const live = livePhotos(album);
  return live.find((photo) => photo.id === album.coverPhotoId) ?? live[0] ?? null;
}

/** 12 characters of [a-z0-9], different from every id already used (including deleted albums). */
export function newAlbumId(existing: Iterable<string> = []): string {
  const taken = new Set(existing);
  for (;;) {
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    if (ALBUM_ID_PATTERN.test(id) && !taken.has(id)) return id;
  }
}

function clone(data: GalleryData): GalleryData {
  return structuredClone(data);
}

function findLiveAlbum(data: GalleryData, albumId: string): Album | null {
  return data.albums.find((album) => album.id === albumId && !album.deletedAt) ?? null;
}

function ok<T>(data: GalleryData, value: T, albumTitle: string, discardedPublicIds: string[] = []): Applied<T> {
  return { ok: true, data, value, albumTitle, discardedPublicIds };
}

const time = (value: Date | string | null): number => (value ? new Date(value).getTime() : 0);

/**
 * Keeps at most MAX_DELETED_ALBUMS deleted albums and MAX_DELETED_PHOTOS
 * deleted photos in the document (research R4). The oldest go first, and
 * their images are returned for deletion from Cloudinary.
 */
export function enforceRetention(input: GalleryData): { data: GalleryData; discardedPublicIds: string[] } {
  const data = clone(input);
  const discarded: string[] = [];

  const deletedAlbums = data.albums.filter((album) => album.deletedAt).sort((a, b) => time(a.deletedAt) - time(b.deletedAt));
  const excessAlbums = new Set(deletedAlbums.slice(0, Math.max(0, deletedAlbums.length - MAX_DELETED_ALBUMS)).map((album) => album.id));
  if (excessAlbums.size > 0) {
    for (const album of data.albums) {
      if (excessAlbums.has(album.id)) discarded.push(...album.photos.map((photo) => photo.image.publicId));
    }
    data.albums = data.albums.filter((album) => !excessAlbums.has(album.id));
  }

  const deletedPhotos = data.albums
    .flatMap((album) => album.photos.filter((photo) => photo.deletedAt).map((photo) => ({ album, photo })))
    .sort((a, b) => time(a.photo.deletedAt) - time(b.photo.deletedAt));
  const excessPhotos = deletedPhotos.slice(0, Math.max(0, deletedPhotos.length - MAX_DELETED_PHOTOS));
  if (excessPhotos.length > 0) {
    const drop = new Set(excessPhotos.map(({ photo }) => photo.id));
    for (const album of data.albums) {
      album.photos = album.photos.filter((photo) => {
        if (!drop.has(photo.id)) return true;
        discarded.push(photo.image.publicId);
        return false;
      });
    }
  }

  return { data, discardedPublicIds: discarded.filter(Boolean) };
}

// ---------- Albums ----------

export interface AlbumDetails {
  title: string;
  description: string;
  date: string | null;
}

export function applyCreateAlbum(input: GalleryData, details: AlbumDetails, now: Date, id?: string): Applied<string> {
  if (liveAlbums(input).length >= MAX_ALBUMS) return { ok: false, error: "full" };
  const data = clone(input);
  const albumId = id ?? newAlbumId(data.albums.map((album) => album.id));
  data.albums.push({
    id: albumId,
    title: details.title,
    description: details.description,
    date: details.date,
    coverPhotoId: null,
    photos: [],
    rev: 1,
    createdAt: now,
    deletedAt: null,
  });
  return ok(data, albumId, details.title);
}

export function applyUpdateAlbum(input: GalleryData, albumId: string, rev: number, details: AlbumDetails): Applied {
  const data = clone(input);
  const album = findLiveAlbum(data, albumId);
  if (!album) return { ok: false, error: "not_found" };
  if (album.rev !== rev) return { ok: false, error: "conflict" };
  album.title = details.title;
  album.description = details.description;
  album.date = details.date;
  album.rev += 1;
  return ok(data, undefined, details.title);
}

/** `albumIds` must be every live album id exactly once; deleted albums keep their place after the live ones. */
export function applyReorderAlbums(input: GalleryData, albumIds: readonly string[]): Applied {
  const live = liveAlbums(input);
  if (!sameSet(live.map((album) => album.id), albumIds)) return { ok: false, error: "invalid" };
  const data = clone(input);
  const byId = new Map(data.albums.map((album) => [album.id, album]));
  data.albums = [...albumIds.map((id) => byId.get(id)!), ...data.albums.filter((album) => album.deletedAt)];
  return ok(data, undefined, "");
}

export function applyDeleteAlbum(input: GalleryData, albumId: string, now: Date): Applied {
  const data = clone(input);
  const album = findLiveAlbum(data, albumId);
  if (!album) return { ok: false, error: "not_found" };
  album.deletedAt = now;
  const retained = enforceRetention(data);
  return ok(retained.data, undefined, album.title, retained.discardedPublicIds);
}

// ---------- Photos ----------

export interface NewPhoto {
  id: string;
  image: ImageRef;
  caption: string;
}

export interface AddPhotosValue {
  added: number;
  /** Photos that did not fit, in selection order. Their assets are in `discardedPublicIds`. */
  refusedFull: NewPhoto[];
}

/** Keeps the first photos that fit (selection order), refuses the rest (FR-011, FR-012). No room at all → `full`. */
export function applyAddPhotos(input: GalleryData, albumId: string, photos: readonly NewPhoto[]): Applied<AddPhotosValue> {
  const data = clone(input);
  const album = findLiveAlbum(data, albumId);
  if (!album) return { ok: false, error: "not_found" };
  const room = Math.max(0, MAX_PHOTOS_PER_ALBUM - livePhotos(album).length);
  if (room === 0) return { ok: false, error: "full" };
  const accepted = photos.slice(0, room);
  const refusedFull = photos.slice(room);
  // New photos go after the live ones; deleted photos stay at the end.
  const live = livePhotos(album);
  const deleted = album.photos.filter((photo) => photo.deletedAt);
  album.photos = [...live, ...accepted.map((photo) => ({ ...photo, deletedAt: null })), ...deleted];
  return ok(
    data,
    { added: accepted.length, refusedFull: [...refusedFull] },
    album.title,
    refusedFull.map((photo) => photo.image.publicId),
  );
}

function findLivePhoto(album: Album, photoId: string): Photo | null {
  return album.photos.find((photo) => photo.id === photoId && !photo.deletedAt) ?? null;
}

export function applyUpdatePhoto(input: GalleryData, albumId: string, photoId: string, caption: string): Applied {
  const data = clone(input);
  const album = findLiveAlbum(data, albumId);
  const photo = album ? findLivePhoto(album, photoId) : null;
  if (!album || !photo) return { ok: false, error: "not_found" };
  photo.caption = caption;
  return ok(data, undefined, album.title);
}

export function applyReorderPhotos(input: GalleryData, albumId: string, photoIds: readonly string[]): Applied {
  const data = clone(input);
  const album = findLiveAlbum(data, albumId);
  if (!album) return { ok: false, error: "not_found" };
  const live = livePhotos(album);
  if (!sameSet(live.map((photo) => photo.id), photoIds)) return { ok: false, error: "invalid" };
  const byId = new Map(live.map((photo) => [photo.id, photo]));
  album.photos = [...photoIds.map((id) => byId.get(id)!), ...album.photos.filter((photo) => photo.deletedAt)];
  return ok(data, undefined, album.title);
}

export function applySetCover(input: GalleryData, albumId: string, photoId: string): Applied {
  const data = clone(input);
  const album = findLiveAlbum(data, albumId);
  if (!album || !findLivePhoto(album, photoId)) return { ok: false, error: "not_found" };
  album.coverPhotoId = photoId;
  return ok(data, undefined, album.title);
}

/** Deleting the cover clears the choice, so the next live photo becomes the cover (FR-015). */
export function applyDeletePhoto(input: GalleryData, albumId: string, photoId: string, now: Date): Applied {
  const data = clone(input);
  const album = findLiveAlbum(data, albumId);
  const photo = album ? findLivePhoto(album, photoId) : null;
  if (!album || !photo) return { ok: false, error: "not_found" };
  photo.deletedAt = now;
  if (album.coverPhotoId === photoId) album.coverPhotoId = null;
  const retained = enforceRetention(data);
  return ok(retained.data, undefined, album.title, retained.discardedPublicIds);
}

/** Reorders a list of ids by moving one position (for the up/down buttons). */
export function moveId(ids: readonly string[], from: number, to: number): string[] {
  return moveItem(ids, from, to);
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  if (new Set(b).size !== b.length) return false;
  return b.every((id) => set.has(id));
}

// ---------- Views ----------

export function toAdminAlbum(album: Album): AdminAlbum {
  const photos = livePhotos(album);
  const cover = effectiveCover(album);
  return {
    id: album.id,
    title: album.title,
    description: album.description,
    date: album.date,
    rev: album.rev,
    cover: cover?.image ?? null,
    coverPhotoId: cover?.id ?? null,
    photoCount: photos.length,
    photos: photos.map((photo) => ({ id: photo.id, image: photo.image, caption: photo.caption, isCover: photo.id === cover?.id })),
    maxPhotos: MAX_PHOTOS_PER_ALBUM,
  };
}

export function toAdminGallery(data: GalleryData): AdminGallery {
  return { albums: liveAlbums(data).map(toAdminAlbum), maxAlbums: MAX_ALBUMS };
}

/** Only what the site shows (FR-003, FR-031): live albums with at least one live photo, live photos only. */
export function toPublicGallery(data: GalleryData): PublicGallery {
  const albums: PublicAlbum[] = [];
  for (const album of liveAlbums(data)) {
    const photos = livePhotos(album);
    const cover = effectiveCover(album);
    if (photos.length === 0 || !cover) continue;
    albums.push({
      id: album.id,
      title: album.title,
      description: album.description,
      date: album.date,
      cover: cover.image,
      photoCount: photos.length,
      photos: photos.map((photo) => ({ id: photo.id, image: photo.image, caption: photo.caption })),
    });
  }
  return { albums };
}

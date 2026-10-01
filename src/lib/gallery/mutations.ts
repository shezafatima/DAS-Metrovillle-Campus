import { deleteUploadedImage, SETTINGS_GALLERY_FOLDER, verifyUploadedImage } from "@/lib/cloudinary";
import { ensureMigratedOnce } from "./migrate";
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
  toAdminAlbum,
  toAdminGallery,
  type Applied,
  type NewPhoto,
} from "./rules";
import { readGallery, writeWithRetry } from "./store";
import type { AddPhotosResult, AdminAlbum, AdminGallery, GalleryAction, GalleryData, ImageRef } from "./types";

/**
 * One function per gallery action (007, contracts/gallery-actions.md).
 * Inputs are already validated by the caller (the Server Action); the actor
 * comes from the session, never from the input. Each returns the result for
 * the admin screen plus what to log. Nothing here checks access; the Server
 * Actions do that first.
 */

export type MutationError = "full" | "not_found" | "conflict" | "invalid" | "unavailable";

export type MutationResult<T> =
  | { ok: true; data: T; log: { action: GalleryAction; albumTitle: string } }
  | { ok: false; error: MutationError };

async function discard(publicIds: readonly string[]): Promise<void> {
  for (const publicId of publicIds) await deleteUploadedImage(publicId);
}

function albumView(data: GalleryData, albumId: string): AdminAlbum | null {
  const album = data.albums.find((entry) => entry.id === albumId && !entry.deletedAt);
  return album ? toAdminAlbum(album) : null;
}

/** Runs one change through the compare-and-set writer and turns the outcome into a result. */
async function run<T, V>(
  actorEmail: string,
  action: GalleryAction,
  mutate: (data: GalleryData) => Applied<V>,
  view: (data: GalleryData, value: V) => T,
): Promise<MutationResult<T>> {
  try {
    await ensureMigratedOnce();
    const written = await writeWithRetry(mutate, { actorEmail });
    if (!written.ok) return { ok: false, error: written.error };
    await discard(written.discardedPublicIds);
    return { ok: true, data: view(written.data, written.value), log: { action, albumTitle: written.albumTitle } };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export interface AlbumDetailsValue {
  title: string;
  description: string;
  date: string | null;
}

export function createAlbum(details: AlbumDetailsValue, actorEmail: string): Promise<MutationResult<AdminGallery>> {
  return run(actorEmail, "album_created", (data) => applyCreateAlbum(data, details, new Date()), (data) => toAdminGallery(data));
}

export function updateAlbum(
  input: AlbumDetailsValue & { albumId: string; rev: number },
  actorEmail: string,
): Promise<MutationResult<AdminGallery>> {
  const { albumId, rev, ...details } = input;
  return run(actorEmail, "album_updated", (data) => applyUpdateAlbum(data, albumId, rev, details), (data) => toAdminGallery(data));
}

export function reorderAlbums(albumIds: string[], actorEmail: string): Promise<MutationResult<AdminGallery>> {
  return run(actorEmail, "album_reordered", (data) => applyReorderAlbums(data, albumIds), (data) => toAdminGallery(data));
}

export function deleteAlbum(albumId: string, actorEmail: string): Promise<MutationResult<AdminGallery>> {
  return run(actorEmail, "album_deleted", (data) => applyDeleteAlbum(data, albumId, new Date()), (data) => toAdminGallery(data));
}

function albumResult(albumId: string) {
  return (data: GalleryData): AdminAlbum => albumView(data, albumId)!;
}

export function updatePhoto(input: { albumId: string; photoId: string; caption: string }, actorEmail: string) {
  return run(actorEmail, "photo_updated", (data) => applyUpdatePhoto(data, input.albumId, input.photoId, input.caption), albumResult(input.albumId));
}

export function reorderPhotos(input: { albumId: string; photoIds: string[] }, actorEmail: string) {
  return run(actorEmail, "photos_reordered", (data) => applyReorderPhotos(data, input.albumId, input.photoIds), albumResult(input.albumId));
}

export function setCover(input: { albumId: string; photoId: string }, actorEmail: string) {
  return run(actorEmail, "cover_changed", (data) => applySetCover(data, input.albumId, input.photoId), albumResult(input.albumId));
}

export function deletePhoto(input: { albumId: string; photoId: string }, actorEmail: string) {
  return run(actorEmail, "photo_deleted", (data) => applyDeletePhoto(data, input.albumId, input.photoId, new Date()), albumResult(input.albumId));
}

/**
 * Adds a selection of already-uploaded images (research R7):
 *  1. verify each image's real content, size and folder; rejected ones are
 *     listed and their assets deleted;
 *  2. keep the verified images that fit, against the latest stored album,
 *     inside the compare-and-set retry, so the album never passes 8;
 *  3. delete the assets of images that did not fit.
 * A Cloudinary outage stores nothing and returns `unavailable`.
 */
export async function addPhotos(
  input: { albumId: string; photos: { image: ImageRef; caption: string }[] },
  actorEmail: string,
): Promise<MutationResult<AddPhotosResult>> {
  const all = input.photos.map((photo) => photo.image.publicId);
  try {
    await ensureMigratedOnce();
    const current = await readGallery();
    if (!albumView(current.data, input.albumId)) {
      await discard(all);
      return { ok: false, error: "not_found" };
    }

    const verified: NewPhoto[] = [];
    const rejected: { index: number; reason: "image" }[] = [];
    for (const [index, photo] of input.photos.entries()) {
      const verdict = await verifyUploadedImage(photo.image.publicId, SETTINGS_GALLERY_FOLDER);
      if (verdict.ok) {
        verified.push({ id: crypto.randomUUID(), image: photo.image, caption: photo.caption });
      } else if (verdict.reason === "unavailable") {
        return { ok: false, error: "unavailable" };
      } else {
        rejected.push({ index, reason: "image" });
        await deleteUploadedImage(photo.image.publicId);
      }
    }

    if (verified.length === 0) {
      return {
        ok: true,
        data: { album: albumView(current.data, input.albumId)!, added: 0, refusedFull: 0, rejected },
        log: { action: "photos_added", albumTitle: albumView(current.data, input.albumId)!.title },
      };
    }

    const written = await writeWithRetry((data) => applyAddPhotos(data, input.albumId, verified), { actorEmail });
    if (!written.ok) {
      if (written.error === "full" || written.error === "not_found") await discard(verified.map((photo) => photo.image.publicId));
      return { ok: false, error: written.error };
    }
    await discard(written.discardedPublicIds);
    return {
      ok: true,
      data: {
        album: albumView(written.data, input.albumId)!,
        added: written.value.added,
        refusedFull: written.value.refusedFull.length,
        rejected,
      },
      log: { action: "photos_added", albumTitle: written.albumTitle },
    };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

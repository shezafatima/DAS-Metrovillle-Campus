/**
 * Gallery albums (007) — data shapes (specs/007-gallery-albums/data-model.md).
 * Pure types and constants: no server imports, so the admin UI (client) and
 * the server share them.
 *
 * The whole gallery is ONE document, `settings/_id: "gallery"`, written only
 * through src/lib/gallery/store.ts with a version compare-and-set
 * (ADR-0005). That design is valid only while the caps below keep the record
 * small; raising them means revisiting ADR-0005 first.
 */

import type { ImageRef } from "@/lib/settings/types";

export type { ImageRef };

export const GALLERY_DOC_ID = "gallery";
export const GALLERY_SCHEMA = 2;
export const MAX_ALBUMS = 6;
export const MAX_PHOTOS_PER_ALBUM = 8;
export const MAX_MIGRATED_PHOTOS = MAX_ALBUMS * MAX_PHOTOS_PER_ALBUM; // 48
/** Retention bound for soft-deleted items, across the whole gallery (research R4). */
export const MAX_DELETED_ALBUMS = 50;
export const MAX_DELETED_PHOTOS = 200;
export const ALBUM_ID_PATTERN = /^[a-z0-9]{12}$/;

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 300;
export const CAPTION_MAX = 150;

export interface Photo {
  id: string;
  image: ImageRef;
  caption: string;
  deletedAt: Date | string | null;
}

export interface Album {
  id: string;
  title: string;
  description: string;
  /** "YYYY-MM-DD" or null. */
  date: string | null;
  /** Chosen cover; null (or a deleted photo) means the first live photo. */
  coverPhotoId: string | null;
  photos: Photo[];
  /** Bumped when title/description/date change; stale edits are refused (FR-026). */
  rev: number;
  createdAt: Date | string;
  deletedAt: Date | string | null;
}

/** An image already soft-deleted in the 005 flat gallery; kept, never shown (FR-020). */
export interface RetiredImage {
  id: string;
  image: ImageRef;
  caption: string;
  deletedAt: Date | string;
}

export interface GalleryData {
  schema: typeof GALLERY_SCHEMA;
  albums: Album[];
  retired: RetiredImage[];
  migration?: { at: Date | string; migrated: number; notMigrated: number };
}

// ---- Admin view (live items only) ----

export interface AdminPhoto {
  id: string;
  image: ImageRef;
  caption: string;
  isCover: boolean;
}

export interface AdminAlbum {
  id: string;
  title: string;
  description: string;
  date: string | null;
  rev: number;
  cover: ImageRef | null;
  coverPhotoId: string | null;
  photoCount: number;
  photos: AdminPhoto[];
  maxPhotos: typeof MAX_PHOTOS_PER_ALBUM;
}

export interface AdminGallery {
  albums: AdminAlbum[];
  maxAlbums: typeof MAX_ALBUMS;
}

// ---- Public view (live albums with at least one live photo) ----

export interface PublicPhoto {
  id: string;
  image: ImageRef;
  caption: string;
}

export interface PublicAlbum {
  id: string;
  title: string;
  description: string;
  date: string | null;
  cover: ImageRef;
  photoCount: number;
  photos: PublicPhoto[];
}

export interface PublicGallery {
  albums: PublicAlbum[];
}

// ---- Results ----

export type GalleryErrorCode = "invalid" | "full" | "not_found" | "conflict" | "unavailable";

export type GalleryResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: "unauthorized" | "forbidden" }
  | { status: "error"; error: "invalid"; fields: Record<string, string> }
  | { status: "error"; error: "full" | "not_found" | "conflict" | "unavailable" };

export interface AddPhotosResult {
  album: AdminAlbum;
  added: number;
  refusedFull: number;
  rejected: { index: number; reason: "image" }[];
}

export type GalleryAction =
  | "album_created"
  | "album_updated"
  | "album_reordered"
  | "album_deleted"
  | "photos_added"
  | "photo_updated"
  | "photos_reordered"
  | "cover_changed"
  | "photo_deleted";

import { expect, type Page } from "@playwright/test";
import mongoose from "mongoose";

/**
 * Helpers for the 007 gallery specs. They touch the one `settings/_id:
 * "gallery"` document directly, to seed either the 005 flat shape (for the
 * migration) or the album shape, and to read back exactly what was stored.
 * The Playwright dev server runs with E2E_FRESH_READS=1, so public
 * pages see seeded data at once (no 60 s cache).
 *
 * Every gallery spec is named `admin-gallery-*.spec.ts` so it runs in the
 * serial admin project: they all share this one document.
 */

async function withDb<T>(fn: (db: mongoose.mongo.Db) => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("[e2e/helpers/gallery] MONGODB_URI is not set");
  const wasConnected = mongoose.connection.readyState !== 0;
  if (!wasConnected) await mongoose.connect(uri, { dbName: "dar_e_arqam_test", serverSelectionTimeoutMS: 15000 });
  try {
    return await fn(mongoose.connection.db!);
  } finally {
    if (!wasConnected) await mongoose.disconnect().catch(() => {});
  }
}

export interface SeedPhoto {
  id?: string;
  name?: string;
  caption?: string;
  deleted?: boolean;
}

export interface SeedAlbum {
  id: string;
  title: string;
  description?: string;
  date?: string | null;
  photos?: SeedPhoto[];
  deleted?: boolean;
  coverPhotoId?: string | null;
}

export function galleryImage(name: string) {
  return {
    url: `https://res.cloudinary.com/e2e/image/upload/v1/settings/gallery/${name}.jpg`,
    publicId: `settings/gallery/${name}`,
    width: 800,
    height: 600,
  };
}

/** A 12-character album id from a short label (padded with "0"). */
export function albumId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "").padEnd(12, "0").slice(0, 12);
}

export async function clearGallery(): Promise<void> {
  await withDb(async (db) => {
    await db.collection("settings").deleteOne({ _id: "gallery" as never });
  });
}

/** Stores the album shape (schema 2) directly. */
export async function seedAlbums(albums: SeedAlbum[], version = 1): Promise<void> {
  const now = new Date();
  const data = {
    schema: 2,
    retired: [],
    albums: albums.map((album) => ({
      id: album.id,
      title: album.title,
      description: album.description ?? "",
      date: album.date ?? null,
      coverPhotoId: album.coverPhotoId ?? null,
      rev: 1,
      createdAt: now,
      deletedAt: album.deleted ? now : null,
      photos: (album.photos ?? []).map((photo, i) => ({
        id: photo.id ?? crypto.randomUUID(),
        image: galleryImage(photo.name ?? `${album.id}-${i}`),
        caption: photo.caption ?? "",
        deletedAt: photo.deleted ? now : null,
      })),
    })),
  };
  await withDb(async (db) => {
    await db
      .collection("settings")
      .replaceOne({ _id: "gallery" as never }, { _id: "gallery" as never, data, version, updatedBy: "seed@example.test", updatedAt: now }, { upsert: true });
  });
}

/** Stores the 005 flat gallery shape directly: `live` captioned images and `deleted` soft-deleted ones. */
export async function seedFlatGallery(live: number, deleted = 0): Promise<void> {
  const now = new Date();
  const item = (name: string, caption: string, deletedAt: Date | null) => ({ id: crypto.randomUUID(), image: galleryImage(name), caption, deletedAt });
  const images = [
    ...Array.from({ length: live }, (_, i) => item(`flat${i}`, `Flat photo ${i + 1}`, null)),
    ...Array.from({ length: deleted }, (_, i) => item(`gone${i}`, `Deleted ${i + 1}`, now)),
  ];
  await withDb(async (db) => {
    await db
      .collection("settings")
      .replaceOne({ _id: "gallery" as never }, { _id: "gallery" as never, data: { images }, version: 3, updatedBy: "seed@example.test", updatedAt: now }, { upsert: true });
  });
}

export interface StoredAlbum {
  id: string;
  title: string;
  rev: number;
  deletedAt: unknown;
  coverPhotoId: string | null;
  photos: { id: string; caption: string; deletedAt: unknown; image: { publicId: string } }[];
}

/** What is stored, including deleted items. Null when there is no document. */
export async function readGallery(): Promise<{ schema?: number; albums: StoredAlbum[]; migration?: unknown; images?: unknown[] } | null> {
  return withDb(async (db) => {
    const doc = await db.collection("settings").findOne({ _id: "gallery" as never });
    return doc ? (doc.data as { schema?: number; albums: StoredAlbum[] }) : null;
  });
}

export async function liveAlbums(): Promise<StoredAlbum[]> {
  return ((await readGallery())?.albums ?? []).filter((album) => !album.deletedAt);
}

/** Opens the admin album list and waits for it. */
export async function openAlbumList(page: Page): Promise<void> {
  await page.goto("/admin/settings/gallery");
  await expect(page.getByTestId("album-list")).toBeVisible({ timeout: 90_000 });
}

/** Opens one album's admin screen and waits for it. */
export async function openAlbum(page: Page, id: string): Promise<void> {
  await page.goto(`/admin/settings/gallery/${id}`);
  await expect(page.getByTestId("album-photos")).toBeVisible({ timeout: 90_000 });
}

/** The right-hand album details panel. */
export function albumPanel(page: Page) {
  return page.getByTestId("album-panel");
}

/** Horizontal overflow check used by the layout specs. */
export async function hasNoHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

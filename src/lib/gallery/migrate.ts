import { deleteUploadedImage } from "@/lib/cloudinary";
import { connectDb } from "@/lib/db";
import { logSecurityEvent } from "@/lib/log";
import { freshReadsForTests } from "@/lib/e2e-fresh-reads";
import { Settings } from "@/models/settings";
import { newAlbumId } from "./rules";
import { isGalleryData } from "./store";
import {
  GALLERY_DOC_ID,
  GALLERY_SCHEMA,
  MAX_MIGRATED_PHOTOS,
  MAX_PHOTOS_PER_ALBUM,
  type Album,
  type GalleryData,
  type ImageRef,
  type RetiredImage,
} from "./types";

/**
 * Moves the 005 flat photo gallery into albums (007 US3, research R6).
 *
 * Live images are placed in order into "Gallery", "Gallery 2" … 8 per
 * album, up to 6 albums (48 photos). Images past the 48th are NOT migrated
 * and not kept anywhere (owner's decision); the report says how many.
 * Images already soft-deleted in 005 stay deleted, kept in `retired`.
 */

interface FlatImage {
  id?: unknown;
  image?: unknown;
  caption?: unknown;
  deletedAt?: unknown;
}

export interface MigrationOutcome {
  data: GalleryData;
  migrated: number;
  notMigrated: number;
  discardedPublicIds: string[];
  alreadyMigrated: boolean;
}

function isImageRef(value: unknown): value is ImageRef {
  return typeof value === "object" && value !== null && typeof (value as ImageRef).url === "string" && typeof (value as ImageRef).publicId === "string";
}

export function albumTitleFor(index: number): string {
  return index === 0 ? "Gallery" : `Gallery ${index + 1}`;
}

/** Pure: the schema 2 data for a stored 005 flat gallery value. */
export function migrateFlatGallery(old: unknown, now: Date = new Date()): MigrationOutcome {
  if (isGalleryData(old)) {
    return { data: old, migrated: 0, notMigrated: 0, discardedPublicIds: [], alreadyMigrated: true };
  }

  const images = Array.isArray((old as { images?: unknown } | null)?.images)
    ? ((old as { images: unknown[] }).images.filter((entry) => entry && typeof entry === "object") as FlatImage[])
    : [];
  const valid = images.filter((entry) => isImageRef(entry.image));
  const live = valid.filter((entry) => !entry.deletedAt);
  const retired: RetiredImage[] = valid
    .filter((entry) => entry.deletedAt)
    .map((entry) => ({
      id: String(entry.id ?? crypto.randomUUID()),
      image: entry.image as ImageRef,
      caption: typeof entry.caption === "string" ? entry.caption : "",
      deletedAt: entry.deletedAt as Date | string,
    }));

  const kept = live.slice(0, MAX_MIGRATED_PHOTOS);
  const dropped = live.slice(MAX_MIGRATED_PHOTOS);

  const albums: Album[] = [];
  const ids: string[] = [];
  for (let start = 0; start < kept.length; start += MAX_PHOTOS_PER_ALBUM) {
    const id = newAlbumId(ids);
    ids.push(id);
    albums.push({
      id,
      title: albumTitleFor(albums.length),
      description: "",
      date: null,
      coverPhotoId: null,
      rev: 1,
      createdAt: now,
      deletedAt: null,
      photos: kept.slice(start, start + MAX_PHOTOS_PER_ALBUM).map((entry) => ({
        id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
        image: entry.image as ImageRef,
        caption: typeof entry.caption === "string" ? entry.caption : "",
        deletedAt: null,
      })),
    });
  }

  return {
    data: {
      schema: GALLERY_SCHEMA,
      albums,
      retired,
      migration: { at: now, migrated: kept.length, notMigrated: dropped.length },
    },
    migrated: kept.length,
    notMigrated: dropped.length,
    discardedPublicIds: dropped.map((entry) => (entry.image as ImageRef).publicId).filter(Boolean),
    alreadyMigrated: false,
  };
}

export type EnsureResult =
  | { status: "none" }
  | { status: "already" }
  | { status: "migrated"; migrated: number; notMigrated: number; albums: number };

let migrationDone = false;

// Test-only (src/lib/e2e-fresh-reads.ts): skips the once-per-process
// migration flag and the public cache so Playwright specs that seed the
// database directly see their data at once.
export { freshReadsForTests };

/** True once this process has seen the gallery in the album shape (or with no document at all). */
export function isMigrationKnownDone(): boolean {
  return migrationDone && !freshReadsForTests();
}

/** For unit tests. */
export function resetMigrationFlag(): void {
  migrationDone = false;
}

/**
 * Migrates the stored gallery if it is still the 005 flat shape. Idempotent
 * and race-safe: the rewrite is one compare-and-set on the version read, so
 * of two concurrent runs exactly one writes, and the other then sees schema 2.
 * Discarded images are deleted from Cloudinary only after the write succeeds.
 */
export async function ensureGalleryMigrated(actorEmail = "system:migration"): Promise<EnsureResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await connectDb();
    const doc = await Settings.findById(GALLERY_DOC_ID).lean();
    if (!doc) {
      migrationDone = true;
      return { status: "none" };
    }
    if (isGalleryData(doc.data)) {
      migrationDone = true;
      return { status: "already" };
    }

    const outcome = migrateFlatGallery(doc.data);
    const updated = await Settings.findOneAndUpdate(
      { _id: GALLERY_DOC_ID, version: doc.version },
      { $set: { data: outcome.data, updatedBy: actorEmail }, $inc: { version: 1 } },
      { returnDocument: "after" },
    ).lean();
    if (!updated) continue; // someone else migrated (or wrote) first — re-read

    migrationDone = true;
    for (const publicId of outcome.discardedPublicIds) await deleteUploadedImage(publicId);
    logSecurityEvent({
      type: "gallery_migrated",
      email: actorEmail,
      outcome: `migrated=${outcome.migrated};not_migrated=${outcome.notMigrated}`,
    });
    return { status: "migrated", migrated: outcome.migrated, notMigrated: outcome.notMigrated, albums: outcome.data.albums.length };
  }
  return { status: "already" };
}

/**
 * The cheap form for hot paths (public reads, every admin action): checks the
 * database only until this process has seen the album shape once. Safe
 * because nothing writes the flat shape any more (research R12), and
 * readGallery() refuses the flat shape if it ever appeared.
 */
export async function ensureMigratedOnce(): Promise<void> {
  if (isMigrationKnownDone()) return;
  await ensureGalleryMigrated();
}

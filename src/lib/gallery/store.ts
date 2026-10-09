import { connectDb } from "@/lib/db";
import { Settings } from "@/models/settings";
import { emptyGallery, type Applied } from "./rules";
import { GALLERY_DOC_ID, GALLERY_SCHEMA, type GalleryData } from "./types";

/**
 * The ONLY code that writes the gallery document (007, ADR-0005).
 *
 * The gallery is one document, `settings/_id: "gallery"`. Every write is a
 * compare-and-set on its `version`: the change is computed from the version
 * just read, and stored only if nobody wrote in between. If someone did,
 * the whole read → apply → write is repeated against the new state, so a
 * cap is always checked against the latest data. This is what keeps the
 * gallery at ≤ 6 albums and ≤ 8 photos per album under simultaneous
 * requests, with no transactions.
 */

/** Attempts per write. Each lost race means another writer succeeded, so progress is always made. */
export const WRITE_ATTEMPTS = 10;

export class GalleryNotMigratedError extends Error {
  constructor() {
    super("The gallery document is still in the 005 flat shape; run ensureGalleryMigrated() first.");
  }
}

export interface StoredGallery {
  data: GalleryData;
  /** 0 = no document yet. */
  version: number;
}

export function isGalleryData(value: unknown): value is GalleryData {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { schema?: unknown }).schema === GALLERY_SCHEMA &&
    Array.isArray((value as { albums?: unknown }).albums)
  );
}

/** The stored gallery. A missing document is an empty gallery at version 0. Throws for the old flat shape. */
export async function readGallery(): Promise<StoredGallery> {
  await connectDb();
  const doc = await Settings.findById(GALLERY_DOC_ID).lean();
  if (!doc) return { data: emptyGallery(), version: 0 };
  if (!isGalleryData(doc.data)) throw new GalleryNotMigratedError();
  const data = doc.data as GalleryData;
  return { data: { ...data, retired: Array.isArray(data.retired) ? data.retired : [] }, version: doc.version };
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type WriteResult<T> = Applied<T> | { ok: false; error: "unavailable" };

/**
 * Reads, applies `mutate`, and writes with compare-and-set; repeats on a lost
 * race. A refused change (`mutate` returns `ok: false`) writes nothing.
 * After WRITE_ATTEMPTS lost races, returns `unavailable`.
 */
export async function writeWithRetry<T>(
  mutate: (data: GalleryData) => Applied<T>,
  options: { actorEmail: string; attempts?: number },
): Promise<WriteResult<T>> {
  const attempts = options.attempts ?? WRITE_ATTEMPTS;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await pause(5 + Math.floor(Math.random() * 20 * attempt));
    const { data, version } = await readGallery();
    const result = mutate(data);
    if (!result.ok) return result;

    if (version === 0) {
      try {
        await Settings.create({ _id: GALLERY_DOC_ID, data: result.data as unknown as Record<string, unknown>, version: 1, updatedBy: options.actorEmail });
        return result;
      } catch (error) {
        if (isDuplicateKey(error)) continue;
        throw error;
      }
    }

    const updated = await Settings.findOneAndUpdate(
      { _id: GALLERY_DOC_ID, version },
      { $set: { data: result.data, updatedBy: options.actorEmail }, $inc: { version: 1 } },
      { returnDocument: "after" },
    ).lean();
    if (updated) return result;
  }
  return { ok: false, error: "unavailable" };
}

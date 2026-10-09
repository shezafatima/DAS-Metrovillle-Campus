import { unstable_cache } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { logSecurityEvent } from "@/lib/log";
import { SETTINGS_REVALIDATE_SECONDS, SETTINGS_TAG, SETTINGS_READ_TIMEOUT_MS } from "@/lib/settings/public";
import { GALLERY_TAG } from "./cache-tags";
import { ensureMigratedOnce, freshReadsForTests } from "./migrate";
import { toPublicGallery } from "./rules";
import { readGallery } from "./store";
import { ALBUM_ID_PATTERN, type PublicAlbum, type PublicGallery } from "./types";

/**
 * The one way the public site reads the gallery (007, contracts/public-gallery.md).
 *
 *  - Returns only what the site shows (FR-003, FR-031): live albums with at
 *    least one live photo, and their live photos, in the admin's order.
 *  - Cached for 60 s and tagged like the rest of Settings, so an admin
 *    action shows at once and anything else within a minute.
 *  - Never throws (FR-033): a failed or slow (> 3 s) read falls back to the
 *    last value this process read, else to an empty gallery, which hides the
 *    section. The cached function itself throws, so a failure is never cached.
 *  - The lazy migration check reads the database only until this process has
 *    seen the album shape once (research R8), so after that the public path
 *    makes no database read outside the cache.
 */

const EMPTY: PublicGallery = { albums: [] };

async function readPublic(): Promise<PublicGallery> {
  const { data } = await readGallery();
  return toPublicGallery(data);
}

const cachedRead = unstable_cache(readPublic, ["settings", "gallery-albums"], {
  revalidate: SETTINGS_REVALIDATE_SECONDS,
  tags: [SETTINGS_TAG, GALLERY_TAG],
});

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("gallery read timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

let lastGood: PublicGallery | null = null;

async function load(): Promise<PublicGallery> {
  try {
    await ensureMigratedOnce();
  } catch (error) {
    unstable_rethrow(error);
    // A failed check must not break the read; the read below reports its own failure.
  }
  // Test-only: Playwright specs seed the database directly, so they read past the cache.
  return freshReadsForTests() ? readPublic() : cachedRead();
}

export async function getPublicGallery(): Promise<PublicGallery> {
  try {
    const value = await withTimeout(load(), SETTINGS_READ_TIMEOUT_MS);
    lastGood = value;
    return value;
  } catch (error) {
    // Next's own control-flow errors (dynamic rendering bail-outs) must pass through.
    unstable_rethrow(error);
    logSecurityEvent({ type: "gallery_read_failed", group: "gallery" });
    return lastGood ?? EMPTY;
  }
}

/** One public album, or null for a malformed, unknown, deleted or empty album (→ 404). */
export async function getPublicAlbum(albumId: string): Promise<PublicAlbum | null> {
  if (!ALBUM_ID_PATTERN.test(albumId)) return null;
  const gallery = await getPublicGallery();
  return gallery.albums.find((album) => album.id === albumId) ?? null;
}

/** For unit tests: forget the last good value. */
export function resetPublicGalleryForTests(): void {
  lastGood = null;
}

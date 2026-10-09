import { ensureGalleryMigrated } from "./migrate";
import { toAdminAlbum, toAdminGallery } from "./rules";
import { readGallery } from "./store";
import { ALBUM_ID_PATTERN, type AdminAlbum, type AdminGallery } from "./types";

/**
 * Admin reads of the gallery (007). Always from the database (no cache), and
 * always after the lazy migration check, so the admin never sees the old
 * flat shape. Callers check access first (`requireAdminPage("settings")`).
 */

export async function getAdminGallery(): Promise<AdminGallery> {
  await ensureGalleryMigrated();
  const { data } = await readGallery();
  return toAdminGallery(data);
}

/** The album, or null for a malformed, unknown or deleted id. */
export async function getAdminAlbum(albumId: string): Promise<AdminAlbum | null> {
  if (!ALBUM_ID_PATTERN.test(albumId)) return null;
  await ensureGalleryMigrated();
  const { data } = await readGallery();
  const album = data.albums.find((entry) => entry.id === albumId && !entry.deletedAt);
  return album ? toAdminAlbum(album) : null;
}

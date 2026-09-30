# Contract: Gallery Server Actions (007)

File: `src/app/admin/(dashboard)/settings/gallery/actions.ts` (`"use server"`). Next enforces same-origin for every Server Action (FR-002), as in 005, 010 and 011. Every action:

1. begins with `requireAdminAccess("settings")` and returns `unauthorized` or `forbidden` with no data (FR-001). It logs `access_denied`, as 011 does.
2. takes the actor only from the session. No email or id in the input is read as the actor.
3. validates its input with the shared Zod schemas (`lib/gallery/schema.ts`) and returns `invalid` with `fields` on failure.
4. runs `ensureGalleryMigrated()`, then its mutation in `lib/gallery/mutations.ts`. Structural actions use the retry-on-version loop (research R2).
5. on success, revalidates the `settings` and `settings:gallery` tags (`{ expire: 0 }`), `revalidatePath("/resources")` and `revalidatePath("/resources/gallery/[albumId]", "page")`, logs `gallery_changed` with `action` and `target` = album title, and returns the updated **admin view** of the gallery (or album).

Copy for every message lives in `src/content/admin.ts` (`galleryCopy`), not in the actions.

## Shared result type

```ts
type GalleryResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: "unauthorized" | "forbidden" }
  | { status: "error"; error: "invalid"; fields: Record<string, string> }
  | { status: "error"; error: "full" }            // album cap (6) or photo cap (8)
  | { status: "error"; error: "not_found" }       // album/photo missing or deleted
  | { status: "error"; error: "conflict" }        // detail edit with stale rev
  | { status: "error"; error: "unavailable" };    // database or Cloudinary unreachable, or retries exhausted
```

- `AdminGallery = { albums: AdminAlbum[]; maxAlbums: 6 }`
- `AdminAlbum = { id, title, description, date, rev, cover: ImageRef | null, coverPhotoId: string | null, photoCount, photos: AdminPhoto[], maxPhotos: 8 }`
- `AdminPhoto = { id, image: ImageRef, caption, isCover: boolean }`

These contain live items only.

## Album actions

| Action | Input | Success data | Errors specific to it |
|---|---|---|---|
| `createGalleryAlbum` | `{ title, description?, date? }` | `AdminGallery` | `full` if 6 live albums (checked on the fresh document every retry) |
| `updateGalleryAlbum` | `{ albumId, rev, title, description?, date? }` | `AdminGallery` | `not_found`; `conflict` if the stored `rev` ≠ `rev` (nothing stored) |
| `reorderGalleryAlbums` | `{ albumIds: string[] }` (every live album id exactly once) | `AdminGallery` | `invalid` if the set differs from the live set (for example, another admin added or deleted an album) |
| `deleteGalleryAlbum` | `{ albumId }` | `AdminGallery` | `not_found` |

## Photo actions

| Action | Input | Success data | Errors specific to it |
|---|---|---|---|
| `addGalleryPhotos` | `{ albumId, photos: { image: { publicId, url, width, height }, caption? }[] }` (1–8 items, selection order) | `{ album: AdminAlbum; added: number; refusedFull: number; rejected: { index: number; reason: "image" }[] }` | `not_found`; `full` if 0 room (the whole call refused). All given images are deleted from Cloudinary. |
| `updateGalleryPhoto` | `{ albumId, photoId, caption }` | `AdminAlbum` | `not_found` |
| `reorderGalleryPhotos` | `{ albumId, photoIds: string[] }` (every live photo id once) | `AdminAlbum` | `invalid` if the set differs |
| `setGalleryCover` | `{ albumId, photoId }` | `AdminAlbum` | `not_found` |
| `deleteGalleryPhoto` | `{ albumId, photoId }` | `AdminAlbum` | `not_found`. If it was the cover, `coverPhotoId := null`. |

### `addGalleryPhotos` order of work

1. Access, then input shape.
2. Verify each image with `verifyUploadedImage(publicId, "settings/gallery")`. A failed image is added to `rejected` and its asset is deleted. If verification is unreachable, the call returns `unavailable` and nothing is stored.
3. Retry loop (≤ 5): read the document, `room = 8 − live photos`, `accepted = verified.slice(0, room)`, then write with compare-and-set on `version`. If the version moved, go back to the read.
4. Assets of the images beyond `room` (`refusedFull`) are deleted from Cloudinary after the write.
5. `added = accepted.length`. The UI message: "Added {added}. {refusedFull} not added: this album is full (8 photos)." (only the relevant parts).

Guarantees: live photos never exceed 8, and live albums never exceed 6, under any interleaving of requests (tested with `Promise.all` in DB tests). A refused, invalid, conflicting or unavailable call stores nothing. No refused image is left in Cloudinary.

## Upload signing

Reuses `POST /api/admin/settings/uploads/sign` with `{ "kind": "gallery" }` unchanged (005 contract). It is already covered by the three access cases.

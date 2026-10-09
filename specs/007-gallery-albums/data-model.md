# Data Model: Gallery Albums (007)

Storage: the existing MongoDB `settings` collection (005 `src/models/settings.ts`, unchanged schema). The gallery is the document `_id: "gallery"`, and its `data` field holds the shape below. `version` is the 005 compare-and-set counter (research R1, R2).

## Stored document

```ts
// settings/_id = "gallery"
{
  _id: "gallery",
  version: number,          // +1 on every write; CAS filter
  updatedBy: string,        // admin email
  updatedAt: Date,
  data: GalleryData,
}

interface GalleryData {
  schema: 2;                // absent/1 = the 005 flat shape → migrate (R6)
  albums: Album[];          // live and deleted, in admin order (live order is what matters)
  retired: RetiredImage[];  // 005 images that were already soft-deleted before migration; never shown
  migration?: { at: Date; migrated: number; notMigrated: number };
}

interface Album {
  id: string;               // ^[a-z0-9]{12}$, stable, used in /resources/gallery/<id>
  title: string;            // required, trimmed, 1–80 chars
  description: string;      // "" or ≤ 300 chars
  date: string | null;      // "YYYY-MM-DD" or null
  coverPhotoId: string | null; // chosen cover; null = first live photo
  photos: Photo[];          // live and deleted, in admin order
  rev: number;              // +1 when title/description/date change (detail-edit conflict check, FR-026)
  createdAt: Date;
  deletedAt: Date | null;
}

interface Photo {
  id: string;               // crypto.randomUUID()
  image: ImageRef;          // 005 ImageRef { url, publicId, width, height }, folder settings/gallery
  caption: string;          // "" or ≤ 150 chars
  deletedAt: Date | null;
}

interface RetiredImage { id: string; image: ImageRef; caption: string; deletedAt: Date }
```

A missing document, or `data` without `schema: 2`, means the gallery has not been migrated yet: `ensureGalleryMigrated()` runs first (R6).

## Derived values (never stored)

| Value | Rule |
|---|---|
| Live albums | `albums.filter(a => !a.deletedAt)` |
| Live photos of an album | `a.photos.filter(p => !p.deletedAt)` |
| Album count for the cap | live albums, ≤ **6** (`MAX_ALBUMS`) |
| Photo count for the cap / card | live photos, ≤ **8** (`MAX_PHOTOS_PER_ALBUM`) |
| Remaining room | `8 − live photos` |
| Effective cover | the live photo whose id = `coverPhotoId`, else the first live photo, else none |
| Public album | a live album with ≥ 1 live photo |

## Validation (one Zod schema, shared by client and server — `lib/gallery/schema.ts`)

| Field | Rule | Message |
|---|---|---|
| title | trimmed, 1–80 | "Enter an album title" / "Title must be 80 characters or fewer" |
| description | ≤ 300 | "Description must be 300 characters or fewer" |
| date | empty or a real calendar date `YYYY-MM-DD` | "Enter a valid date" |
| caption | ≤ 150 | "Caption must be 150 characters or fewer" |
| albumId / photoId | `^[a-z0-9]{12}$` / UUID | refused as `invalid` |
| image | verified by `verifyUploadedImage(publicId, "settings/gallery")`: JPG/PNG/WebP, ≤ 5 MB, right folder | "Images must be JPG, PNG or WebP, up to 5 MB." |

Titles, descriptions and captions are stored as given (no HTML) and rendered as text. Urdu is supported through `dir="auto"` on the rendered elements.

## State transitions

**Album**

```
(none) --create [live albums < 6]--> live
live --update details [rev matches]--> live (rev+1)
live --reorder--> live
live --delete (confirmed)--> deleted   (slot freed; photos hidden with it)
deleted --(developer restore only)--> live   [only if live albums < 6]
```

**Photo**

```
(none) --add [album live, live photos < 8, image verified]--> live
live --caption / reorder / make cover--> live
live --delete (confirmed)--> deleted   (if it was the cover: coverPhotoId := null → next photo is cover)
```

Refused transitions return a typed result, never a partial write: `full` (cap), `not_found` (album or photo missing or deleted), `conflict` (detail edit with a stale `rev`), `invalid`, `image_rejected`, `unavailable`.

## Retention bound (R4)

Up to 50 deleted albums and 200 deleted photos across all albums are kept. Beyond that, the oldest by `deletedAt` are dropped from the document and their Cloudinary assets are deleted.

## Migration (R6) — from the 005 flat shape

Input: `data = { images: ListItem[] }`, where each item is `{ id, image, caption, deletedAt }`.

1. `live = images.filter(!deletedAt)`, in stored order. `retired = images.filter(deletedAt)`.
2. `kept = live.slice(0, 48)`. `dropped = live.slice(48)`.
3. Albums are built from chunks of 8 of `kept`: the titles are `"Gallery"`, `"Gallery 2"` … `"Gallery 6"`. Each has `coverPhotoId: null`, `description: ""`, `date: null` and `rev: 1`, and its photos keep their `id`, `image` and `caption`.
4. The result is `{ schema: 2, albums, retired, migration: { at, migrated: kept.length, notMigrated: dropped.length } }`. The assets of `dropped` are deleted from Cloudinary after the compare-and-set succeeds.
5. An empty `live` produces `albums: []`.

It is idempotent: a document already at `schema: 2` is returned unchanged with `migrated: 0, notMigrated: 0, alreadyMigrated: true`.

## Public shape (`getPublicGallery()`)

```ts
interface PublicGallery { albums: PublicAlbum[] }        // admin order, only albums with ≥1 photo
interface PublicAlbum {
  id: string; title: string; description: string; date: string | null;
  cover: ImageRef; photoCount: number;
  photos: { id: string; image: ImageRef; caption: string }[];  // admin order
}
```

The shape has no deleted items, versions, revs, authors or retired images (FR-003).

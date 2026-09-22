# Data Model: News (003)

**Feature**: `003-news` | **Date**: 2026-09-21
**Store**: the application-owned side of the shared MongoDB database
(see `specs/002-foundation/data-model.md`). This feature adds one
collection, `news`, under the application owner, using the 002
soft-delete plugin. Cloudinary holds image binaries; the database stores
only their URLs and ids (user constraint).

---

## NewsPost → `news`

Model: `src/models/news-post.ts` (Mongoose, `softDeletePlugin`,
`timestamps: true`).

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | |
| `title` | string | required, trimmed, 1–200 chars |
| `slug` | string | required, **unique index (no partial filter)** — soft-deleted posts keep their slug reserved; pattern per research §4; not a reserved word (category keys, `page`) |
| `bodyHtml` | string | required; sanitised server-side (research §2); must contain non-empty text |
| `excerpt` | string | derived on every save: plain text of `bodyHtml`, ≤160 chars at a word boundary, "…" when cut; never edited directly |
| `language` | `"en"` \| `"ur"` | required, default `"en"` |
| `category` | `"head-office"` \| `"events"` \| `"activities"` \| `"achievements"` \| `"announcements"` | required |
| `status` | `"draft"` \| `"published"` | required, default `"draft"` |
| `publishDate` | Date | required; stored as UTC midnight of the calendar day (research §5) |
| `coverImage` | subdocument \| `null` | default `null`; see below |
| `deletedAt` | Date \| `null` | added by `softDeletePlugin`; default `null`, indexed |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

### `coverImage` subdocument

| Field | Type | Rules |
|---|---|---|
| `url` | string | `https://res.cloudinary.com/<cloud>/image/upload/...` (validated by pattern) |
| `publicId` | string | must start with `news/covers/` |
| `width`, `height` | int | > 0; from Cloudinary's upload response; used for `next/image` sizing and aspect ratio |
| `alt` | string | required when the subdocument exists; trimmed, 1–200 chars (FR-027) |

No author field (spec: single admin, no attribution).

### Indexes

| Index | Purpose |
|---|---|
| `{ slug: 1 }` unique | FR-004 — including deleted posts |
| `{ deletedAt: 1 }` | from the plugin |
| `{ status: 1, publishDate: -1, deletedAt: 1 }` | public list + visibility predicate; admin list default order |
| `{ category: 1, status: 1, publishDate: -1, deletedAt: 1 }` | category lists and the admin category filter |
| `{ title: 1 }` (non-unique) | admin title search (anchored/regex, case-insensitive; Urdu-safe because it is a plain string comparison, not a text index with language stemming) |

`updatedAt` breaks ties within the same `publishDate` (FR-010).

### Derived values (never stored twice)

- `isPubliclyVisible = status === "published" && publishDate <= startOfTodayPkt() && deletedAt === null` — computed by the single predicate in `src/lib/news/public-queries.ts`.
- `isScheduled = status === "published" && publishDate > startOfTodayPkt()` — admin list marker (FR-014).

### State transitions

```
            create ──────────────► draft
  draft ── publish ──────────────► published
  published ── unpublish ────────► draft
  draft | published ── delete ───► (same status, deletedAt set)   ← soft delete; not restorable from the UI in this feature
```

- `publish` and `unpublish` change only `status` (and `updatedAt`).
- `update` may change any editable field, including `status`, so the
  editor's "Save & publish" is a single request.
- A deleted post is excluded from every admin and public read by the
  plugin; `restoreById` exists (002) but has no UI here (spec
  assumption).

### Validation (shared Zod, `src/lib/validation/news.ts`)

`newsPostInputSchema` — the fields above minus `_id`, `excerpt`,
`deletedAt`, timestamps. Client and server parse the same schema; the
server additionally sanitises `bodyHtml`, computes `excerpt`, resolves
slug uniqueness and verifies a changed `coverImage` against Cloudinary
(research §3, §9).

---

## Category (fixed list, not a collection)

`src/lib/news/categories.ts`:

```ts
export const NEWS_CATEGORIES = [
  { key: "head-office",   label: "Head Office" },
  { key: "events",        label: "Events" },
  { key: "activities",    label: "Activities" },
  { key: "achievements",  label: "Achievements" },
  { key: "announcements", label: "Announcements" },
] as const;
```

The keys are the public addresses (`/news/<key>`), match the 001 menu
links, and are reserved as post slugs. Labels are the only place the
display text lives (Constitution VI copy rule); public and admin UIs
read from this constant.

---

## Read DTOs (what leaves the data layer)

Plain objects, never Mongoose documents (Constitution VII — a second
consumer gets the same shapes):

- `PublicPostSummary`: `slug, title, excerpt, language, category, publishDate (ISO date), coverImage | null`
- `PublicPost`: summary + `bodyHtml`
- `AdminPostRow`: `id, title, slug, status, language, category, publishDate, coverImage?.url | null, isScheduled, updatedAt`
- `AdminPost`: full editable record for the editor

Paged results: `{ items, page, pageSize, total, totalPages }`.

---

## Uploads (no collection)

Cloudinary assets under folder `news/covers/`. The database references
them only via `coverImage`. Replacing/removing a cover or deleting a post
leaves the asset in place (research §3); an orphan-cleanup task is a
follow-up outside this feature.

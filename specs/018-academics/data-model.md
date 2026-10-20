# Data Model: 018-academics

There is no database in this feature. Every shape is a Zod schema in `src/lib/academics/schema.ts`. Types are inferred from the schemas, and every content file is parsed at module load (`src/content/academics/index.ts`). The field helpers come from `src/lib/content/fields.ts` (moved out of `src/lib/about/schema.ts`, research R2).

## Shared value forms

| Form | Zod | Notes |
|---|---|---|
| `text(max)` | trimmed, 1..max | single line |
| `longText(max)` | ≤ max, paragraphs separated by exactly one blank line | displayed by `Paragraphs` |
| `ImageRef` | `{ url, publicId, width, height }` | `url` is absolute (Cloudinary) or starts with `/` (local, `publicId: ""`) |
| `itemId` | `^[a-z0-9]+(-[a-z0-9]+)*$` | stable list-item id, unique within its list |

## VideoEntry

| Field | Type | Rule |
|---|---|---|
| `provider` | `"youtube" \| "instagram"` | |
| `url` | string, ≤ 300 | `""` means no video. Otherwise it MUST parse for its provider (refine). `resolveVideo` returns `null` for anything unparsable as a second guard |
| `poster` | `ImageRef \| null` | `null` means the local placeholder poster |
| `title` | `text(120)` | the iframe title and the source of the play button's label |

Derived (never stored): `PlayableVideo = { provider, embedUrl }` from `resolveVideo(entry)`.

## AcademicsPage

| Field | Type |
|---|---|
| `title` | `text(60)`: "Academics" (pending client approval) |
| `playLabel` | `text(40)`: "Play video". The button's label is `${playLabel}: ${video.title}` |

## AcademicOverview (`academic-overview`)

| Field | Type | Value |
|---|---|---|
| `heading` | `text(80)` | "Academic Excellence" (T3) |
| `subheading` | `text(160)` | "Building Strong Foundations for Lifelong Learning" |
| `body` | `longText(4000)` | 3 paragraphs |
| `image` | `ImageRef \| null` | `null` until the client supplies a photo, which shows the emblem panel |
| `imageAlt` | string ≤ 200 | MUST be non-empty when `image` is set (refine) |

## TeachersTraining (`teachers-training`)

| Field | Type | Rule |
|---|---|---|
| `heading` | `text(80)` | "Teachers' Training" |
| `intro` | `longText(1500)` | 1 paragraph |
| `items` | `{ id: itemId, text: text(160) }[]` | 1..40, unique ids, 19 at launch in source order |
| `photos` | `{ id: itemId, image: ImageRef, alt: text(200) }[]` | 0..3, unique ids. Files live under `public/images/academics/teachers-training/` |
| `video` | `VideoEntry` | `provider: "youtube"`, `url: ""` until supplied |

The `source` export, outside the value: `{ url: "https://das.edu.pk/academics/teachers-training/", copiedOn: "2026-10-12" }` (FR-011).

## HifzEQuran (`hifz-e-quran`)

| Field | Type | Rule |
|---|---|---|
| `heading` | `text(80)` | "HIFZ-UL-QURAN PROGRAM", exactly as written (T4) |
| `subheading` | `text(160)` | "A Meaningful Step Towards a Beautiful World & a Better Hereafter" |
| `intro` | `longText(1500)` | 1 paragraph |
| `subsections` | `{ id: itemId, heading: text(80), body: longText(1500) }[]` | 1..6, unique ids. At launch: `admission-based-on-aptitude` and `hifz-alongside-academic-education`. The second one's body has 2 paragraphs; the second paragraph is the T1 addition |
| `video` | `VideoEntry` | `provider: "instagram"`, `url: ""` until supplied |

## Review metadata (per content file, not part of the value)

`review = { status: "pending-client-approval" | "approved", notes: string[] }`, with a `// PENDING CLIENT APPROVAL:` comment (FR-010). Notes record T1–T7 where they apply.

## Derived view: training photo tiles

`trainingPhotoTiles(photos, showPlaceholders) → { layout, tiles }`:

| Photos | showPlaceholders = false (production) | true (development) |
|---|---|---|
| 0 | `none`, [] | `collage`, 3 placeholders |
| 1 | `single`, [photo] | `collage`, photo + 2 placeholders |
| 2 | `collage`, 2 photos | `collage`, 2 photos |
| 3 | `collage`, 3 photos | `collage`, 3 photos |
| >3 | refused by the schema; the view still slices to the first 3 | same |

`Tile = { id, image: ImageRef | null, alt: string, placeholder: boolean }`.

## Section ids (fixed layout, `pageSections.academics`)

| Order | id | Menu label | Background |
|---|---|---|---|
| 1 | `academic-overview` | Academic Overview | surface |
| 2 | `teachers-training` | Teachers' Training | muted |
| 3 | `hifz-e-quran` | Hifz-e-Quran | surface |

Content can't add, remove or reorder sections (Constitution VIII).

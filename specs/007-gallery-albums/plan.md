# Implementation Plan: Gallery Albums

**Branch**: `007-gallery-albums` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/007-gallery-albums/spec.md`

## Summary

Replace 005's flat Photo gallery group with albums (at most 6 albums, at most 8 photos each). The gallery stays **one document** in the existing `settings` collection (`_id: "gallery"`, new `schema: 2` shape). Albums embed their photos, and every write is a version compare-and-set. Structural actions retry against the fresh document, so the caps hold under simultaneous requests without transactions. Album detail edits carry a per-album `rev` and are refused when stale. Nine per-action Server Actions save immediately. Uploads reuse 005's signed direct Cloudinary upload, and one server call per selection verifies the images, keeps the ones that fit and deletes the rest. A pure, idempotent migration turns the flat list into "Gallery", "Gallery 2" … (8 each, at most 48 photos). It runs from `npm run migrate:gallery` at release and lazily on first read, and reports how many photos were not migrated. The public side replaces the `/resources` placeholder with a minimal page holding a `#photo-gallery` section. Each album gets its own page at `/resources/gallery/<id>`, where choosing a photo opens a full-screen viewer built on the existing Dialog. Feature 016 later adds `#downloads` and `#our-books` around the gallery section.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16.3.5 App Router, React 19.2
**Primary Dependencies**: Mongoose 9, Zod 4, react-hook-form (the 011 panel), Better Auth via `src/lib/dal.ts`, Cloudinary SDK 2, shadcn/ui primitives in `src/components/ui` (Sheet, Dialog, AlertDialog, Button, Input, Toaster), lucide-react. **No new dependencies.**
**Storage**: MongoDB Atlas, the existing `settings` collection with document `_id: "gallery"` (new `data` shape, no schema change to the model). Images are in the Cloudinary folder `settings/gallery` (unchanged).
**Testing**: Vitest (pure unit tests, plus DB-backed tests with `describeWithDb` for compare-and-set, concurrency and migration). Playwright (`admin` project serial, plus public specs).
**Target Platform**: Node server hosting the Next.js app, evergreen browsers, 375/768/1024/1440px.
**Project Type**: Single Next.js web app (public site and admin in one `src/`).
**Performance Goals**: No per-request database read on public pages (60 s cache plus tag revalidation; the migration check runs at most once per process after it has seen `schema: 2`). A change is visible at once after an admin action, and ≤ 60 s otherwise. Public read timeout is 3 s, then the fallback. Album-page images are lazy, and the viewer preloads only its neighbours.
**Constraints**: Caps 6 and 8 fixed. JPG/PNG/WebP up to 5 MB, verified by content. No video. `cacheComponents` stays off. There is at most one writer path to the `gallery` document (the flat group save is removed). At most 5 compare-and-set retries per action.
**Scale/Scope**: At most 48 live photos, 2 admin pages, 9 Server Actions, 3 public routes (plus 1 redirect), 1 CLI script.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I Fidelity | The reference Photo Gallery screenshots (`screenshots/das.edu.pk_resources_photo-gallery_*.png`) show only the page frame: `PageBanner` "Photo Gallery" with a camera photo and the breadcrumb "Home » Resources » Photo Gallery". The album page reproduces that frame exactly. The reference's gallery module is broken, so the grid, cards and viewer use `research/design-tokens.md` and dialog patterns (spec Assumption). The `/resources/photo-gallery` → `/resources#photo-gallery` address change is a documented deviation (spec Clarifications). The Resources page is deliberately minimal until 016, which the owner decided. Layout is checked at the four standard widths and at the reference's own breakpoints. | PASS (deviations recorded in spec) |
| II Fixed stack | Only existing pieces. No lightbox or drag-and-drop library (native drag plus up/down buttons, Radix Dialog). Cloudinary is used for public media only. | PASS |
| III Roles & Access | Both pages call `requireAdminPage("settings")` and all nine actions call `requireAdminAccess("settings")`. The caps are enforced on the server, and disabled buttons are presentation only. | PASS |
| IV Security | Server Actions get Next's same-origin check. The Cloudinary secret stays in the existing sign route. There's no new public write path. Album ids are validated by format before any read. | PASS |
| V Upload verification | The browser pre-checks, and the server `verifyUploadedImage` checks the real format, size and folder. Refused or rejected assets are deleted. | PASS |
| VI Data integrity | One Zod schema is shared by the client and server. Soft delete uses `deletedAt`. Caps and concurrency go through a compare-and-set on a single document, not check-then-insert. The migration is idempotent and atomic. The old write path is closed (R12). | PASS |
| VII Design system | The admin uses existing primitives and tokens. The public cards and viewer use tokens. | PASS |
| VIII Content | The gallery is admin-managed and live without a redeploy. The layout is fixed, and only values change. | PASS |
| IX Components | Server Components by default. Client code is only for the album list, album screen, uploader, details panel and viewer. | PASS |
| X Extensibility | `GallerySection` is a self-contained section with a fixed anchor, so 016 adds siblings without editing it. `getPublicGallery` returns plain data. | PASS |
| XI Testing & DoD | One E2E per story, three access cases for both pages and all nine actions, cap tests by direct call and under `Promise.all`, migration tests, and layout at 4 widths. | PASS |

**Post-design re-check (after Phase 1)**: unchanged, all PASS. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/007-gallery-albums/
├── spec.md
├── plan.md               # this file
├── research.md           # Phase 0 (R1–R13)
├── data-model.md         # Phase 1
├── quickstart.md         # Phase 1
├── contracts/
│   ├── gallery-actions.md
│   ├── access-matrix.md
│   └── public-gallery.md
├── checklists/requirements.md
└── tasks.md              # /sp.tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── lib/gallery/
│   ├── types.ts                  # GalleryData, Album, Photo, Admin*/Public* shapes, MAX_ALBUMS=6, MAX_PHOTOS_PER_ALBUM=8
│   ├── schema.ts                 # Zod: album details, caption, ids, action inputs (client + server)
│   ├── rules.ts                  # pure: liveAlbums, livePhotos, effectiveCover, applyCreate/applyAdd/…, retention bound
│   ├── migrate.ts                # pure migrateFlatGallery() + ensureGalleryMigrated() (CAS)
│   ├── store.ts                  # readGallery(), writeWithRetry(mutator) — the only CAS writer
│   ├── mutations.ts              # one function per action, built on rules + store
│   ├── admin.ts                  # getAdminGallery(), getAdminAlbum(id)
│   ├── public.ts                 # getPublicGallery(), getPublicAlbum(id): cached 60 s, tags, timeout, fallback
│   └── *.test.ts                 # DB-backed suites use describeWithDb() inside *.test.ts (repo convention)
├── lib/settings/
│   ├── types.ts                  # GROUP_KEYS drops "gallery"
│   ├── registry.ts, public.ts    # gallery definition + shape removed
│   └── groups/gallery.ts         # deleted
├── lib/log.ts                    # + gallery_changed, gallery_migrated, gallery_read_failed; + `action` field
├── content/admin.ts              # + galleryCopy (labels, limits, toasts, errors)
├── content/site-shell.ts         # Photo Gallery menu href → /resources#photo-gallery
├── app/admin/(dashboard)/settings/gallery/
│   ├── page.tsx                  # album list (requireAdminPage("settings"))
│   ├── [albumId]/page.tsx        # album screen
│   ├── actions.ts                # 9 Server Actions
│   └── actions.test.ts           # 3 access cases × 9 + behaviour
├── app/(public)/resources/
│   ├── page.tsx                  # minimal Resources page: <GallerySection/>
│   ├── gallery/page.tsx          # redirect → /resources#photo-gallery
│   └── gallery/[albumId]/page.tsx# album page + generateMetadata
├── components/admin/gallery/
│   ├── album-list.tsx            # cards, up/down + drag, create (disabled at 6), delete dialog
│   ├── album-panel.tsx           # Sheet form for create/edit, dirty-close guard, conflict message
│   ├── album-photos.tsx          # photo cards, caption, make cover, up/down + drag, delete
│   └── album-uploader.tsx        # adapted from settings/gallery-uploader.tsx: room-limited, one addGalleryPhotos call
├── components/admin/settings/gallery-uploader.tsx   # deleted (replaced by album-uploader)
├── components/gallery/
│   ├── gallery-section.tsx       # #photo-gallery section, returns null when empty
│   ├── album-card.tsx
│   ├── album-photo-grid.tsx      # client: grid of photo buttons + viewer state
│   └── photo-viewer.tsx          # Dialog, arrows, swipe, n of N, reduced motion
└── test/access-inventory.test.ts, app/api/admin/access-matrix.test.ts   # + rows

scripts/migrate-gallery.ts        # npm run migrate:gallery (tsx), prints the report
next.config.ts                    # + redirect /resources/photo-gallery → /resources#photo-gallery

e2e/
├── admin-gallery-albums.spec.ts  # US1 incl. 7th refused, reorder, rename, delete, conflict
├── admin-gallery-photos.spec.ts  # US2 incl. 9th refused, partial selection, cover rules
├── admin-gallery-access.spec.ts  # 3 cases for both pages
├── admin-gallery-migration.spec.ts # US3 lazy path end to end (serial admin project: shares the gallery record)
├── admin-gallery-public.spec.ts  # US4 grid, album page, viewer keyboard + touch, empty, 404, menu (serial admin project)
├── admin-gallery-layout.spec.ts  # 4 widths + reference breakpoints, long + Urdu titles
├── helpers/gallery.ts            # seed flat/new shapes, stub uploads
└── (updated) admin-settings-*.spec.ts, admin-roles-access-matrix.spec.ts  # flat-gallery cases removed/retargeted
```

**Structure Decision**: single Next.js app, following the existing `src/lib/<domain>/`, `src/components/admin/<domain>/` and `app/admin/(dashboard)/<section>/` layout. The gallery gets its own `lib/gallery` domain, because it no longer fits the definition-driven Settings engine (R12). It still lives under the Settings admin area and permission, and in the `settings` collection.

## Reuse Map

| Need | Existing piece | Change |
|---|---|---|
| Access | `requireAdminPage` / `requireAdminAccess` (011), access inventory and matrix tests | rows only |
| Storage and compare-and-set | `Settings` model, `version` counter (005 `mutations.ts` pattern) | none to the model. `lib/gallery/store.ts` adds the retry loop |
| Upload | `lib/uploads/direct-upload.ts`, `lib/uploads/image-limits.ts`, sign route kind `gallery`, `verifyUploadedImage`, `deleteUploadedImage` | none |
| Multi-file UI | `settings/gallery-uploader.tsx` (005) | adapted into `album-uploader.tsx` (room limit, batch call). The original is deleted |
| Reorder | `moveItem` (`lib/settings/items.ts`), the up/down + native drag pattern of `list-editor.tsx` | reuse `moveItem`. The pattern is repeated in the two gallery lists |
| Confirm delete | `AdminConfirmDeleteDialog` (005 lift) | none |
| Right panel | `ui/sheet.tsx` + `use-sheet-dirty-guard.ts` (005/011) | none |
| Public cache | `getPublicSettings` pattern (`unstable_cache`, tags, timeout, last-good) | mirrored in `lib/gallery/public.ts`, sharing `SETTINGS_TAG` |
| Images | `cloudinaryLoader`, `ogImageUrl` (003) | none |
| Viewer | `ui/dialog.tsx` | none |

## Key Decisions (see research.md)

1. **One document, compare-and-set, retry for structural actions** (R1, R2). This makes the caps hold under concurrency without transactions.
2. **Per-album `rev` for detail edits** (R2), which refuses stale edits without false conflicts across albums.
3. **Immediate per-action saves** (R3).
4. **Opaque 12-character album id in the public address** (R5), stable across renames and safe for Urdu titles.
5. **Pure idempotent migration: a release script plus a lazy fallback, capped at 48, reporting the count not migrated** (R6).
6. **One `addGalleryPhotos` call per selection**, with the server deciding the room and deleting the refused assets (R7).
7. **The flat gallery group is removed from the Settings engine** (R12), leaving a single writer path.
8. **The Resources page is minimal with a fixed `#photo-gallery` section, and the menu link plus a redirect are updated** (R9).

Decisions 1–3 and 5–7 are recorded in [ADR-0005](../../history/adr/0005-gallery-albums-single-document-cas.md) (Accepted; valid only while the 6/8 caps hold).

## Risks and follow-ups

- **Retries exhausted under heavy contention** gives `unavailable` and a "try again" toast. With a handful of admins this is effectively never, and a DB test covers the 5-way concurrent case.
- **005 tests and E2E that target the flat gallery** must be rewritten or removed in the same change, or the suite goes red. The tasks list each file (`defaults.test.ts`, `mutations.test.ts`, `public.test.ts`, `admin-settings-gallery.spec.ts`, `admin-settings-uploads.spec.ts`, `admin-settings-layout.spec.ts`, `admin-settings-access.spec.ts`, `e2e/helpers/settings.ts`). This is the known pre-existing E2E baseline, so failure sets must be diffed rather than read raw.
- **Feature 006's "Photo/Videos" link** should target `/resources#photo-gallery`. It's recorded in 006's open Q2 and not changed here.

## Complexity Tracking

No constitution violations to justify.

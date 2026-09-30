---
description: "Task list for 007 Gallery Albums"
---

# Tasks: Gallery Albums

**Input**: Design documents from `specs/007-gallery-albums/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md) and [ADR-0005](../../history/adr/0005-gallery-albums-single-document-cas.md)
**Prerequisites**: 005 Settings and 011 roles-and-users in the working tree (`Settings` model with `version`, `lib/uploads/*`, `verifyUploadedImage`/`deleteUploadedImage`, `AdminConfirmDeleteDialog`, `use-sheet-dirty-guard.ts`, `requireAdminPage`/`requireAdminAccess`, access inventory/matrix tests).

**Tests**: REQUIRED. The brief's Acceptance and Constitution XI ask for E2E tests for albums up to the cap, photos up to the cap, reorder, delete and public viewing. They also ask for tests proving the caps hold on direct server calls, and three access cases for every gallery route. Write each story's tests first and see them fail.

**Organization**: tasks are grouped by user story (spec.md US1–US5), so each story can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from spec.md
- Paths are repo-relative (single Next.js app, `src/` at the root)

## Conventions for every task

- Read the relevant guide in `node_modules/next/dist/docs/01-app/` before writing Next.js code (CLAUDE.md), especially `03-api-reference/03-file-conventions/dynamic-routes.md`, `not-found.md`, `03-api-reference/04-functions/{unstable_cache,revalidateTag,revalidatePath,redirect,generate-metadata}.md` and `03-api-reference/05-config/01-next-config-js/redirects.md`.
- Copy (labels, messages, toasts) goes in `galleryCopy` in `src/content/admin.ts` (admin) or `src/content/gallery.ts` (public), never inline (Constitution IX).
- No raw design values; use tokens from `research/design-tokens.md` (Constitution VII). No new npm dependencies (Constitution II).
- DB-backed Vitest suites use `describeWithDb()` (`src/test/db.ts`) inside ordinary `*.test.ts` files (the repo has no `*.db.test.ts` convention) and `seedTestAdmin`/`seedTestContentManager` (`src/test/admin-session.ts`). Mock `@/lib/cloudinary` (`verifyUploadedImage`, `deleteUploadedImage`) and set generous hook timeouts, as `access-matrix.test.ts` does.
- Playwright projects: specs named `e2e/admin-*.spec.ts` run in the serial `admin` project, and other names run in `chromium` (`fullyParallel: true`). **Every gallery E2E, including the public ones, is named `e2e/admin-gallery-*.spec.ts`**, because they all seed and change the one `settings/_id:"gallery"` record and would race in a parallel project. Never run `npm run build` and Playwright at the same time. Pre-start the dev server, and compare admin failures against the known baseline.
- The only code that writes the `gallery` document is `src/lib/gallery/store.ts` (ADR-0005).

---

## Phase 1: Setup (shared infrastructure)

**Purpose**: copy, log types and the shared types every other task imports.

- [ ] T001 [P] Add `galleryCopy` to `src/content/admin.ts`:
  - page titles `albums: "Photo gallery"`, `album: (title) => title`
  - `createAlbum: "Create album"`, `albumFull: "The gallery is limited to 6 albums. Delete an album to create a new one."`
  - fields `title: "Album title"`, `description: "Short description (optional)"`, `date: "Date (optional)"`, `caption: "Caption (optional)"`
  - `photoCount: (n) => n === 1 ? "1 photo" : \`${n} photos\``
  - `uploadPhotos: "Upload photos"`, `room: (n) => \`Room for ${n} more\``, `photosFull: "This album is full (8 photos). Delete a photo to add another."`, `addedSummary: (added, refused) => …` (per contracts/gallery-actions.md)
  - `imageLimits: "Images must be JPG, PNG or WebP, up to 5 MB."`
  - `cover: "Cover"`, `makeCover: "Make cover"`, `moveUp`/`moveDown: (name) => …`, `open: "Open"`, `edit: "Edit"`, `save: "Save"`, `cancel: "Cancel"`, `unsavedPrompt`
  - `conflict: "This was changed by someone else. Reload to see their changes."`, `unavailable: "Couldn't save right now. Please try again."`, `invalid: "Check the highlighted fields."`
  - field errors from data-model.md "Validation"
  - toasts per action
  - delete-dialog copy `deleteAlbum` (body: "The album and its photos will be removed from the site.") and `deletePhoto`

  Add `"/admin/settings/gallery/[albumId]"` handling to `adminExtraPageTitles` if titles are keyed there.
- [ ] T002 [P] Create `src/content/gallery.ts` (public copy): `sectionHeading: "Photo Gallery"`, `photoCount`, `backToGallery: "Back to Photo Gallery"`, `viewer: { label: (title) => \`${title} photos\`, previous: "Previous photo", next: "Next photo", close: "Close", position: (n, total) => \`${n} of ${total}\` }`, `photoAlt: (title, n) => \`${title} — photo ${n}\``, a `formatAlbumDate(iso)` helper giving "12 March 2026" (en-GB, UTC), and `photoGalleryBanner: string | null = null`, marked as placeholder content. When the client supplies the reference banner photograph, save it as `public/images/banners/photo-gallery.jpg` and set the constant to `"/images/banners/photo-gallery.jpg"`.
- [ ] T003 [P] In `src/lib/log.ts`, add `"gallery_changed"`, `"gallery_migrated"` and `"gallery_read_failed"` to `SecurityEventType`. Add an optional `action?: string` to `SecurityEvent` and to the logged line, documented as the gallery action name only. Reuse `target` for the album title and `outcome` for `migrated=N;not_migrated=M` (research R13).
- [ ] T004 [P] Create `src/lib/gallery/types.ts` (client-safe, no server imports) exactly per data-model.md: `GalleryData`, `Album`, `Photo`, `RetiredImage`, `AdminGallery`, `AdminAlbum`, `AdminPhoto`, `PublicGallery`, `PublicAlbum`, `GalleryResult<T>`, `MAX_ALBUMS = 6`, `MAX_PHOTOS_PER_ALBUM = 8`, `MAX_MIGRATED_PHOTOS = 48`, `ALBUM_ID_PATTERN = /^[a-z0-9]{12}$/`, `GALLERY_DOC_ID = "gallery"`. Reuse `ImageRef` from `src/lib/settings/types.ts`.

**Checkpoint**: types and copy compile. Nothing is wired yet.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: pure rules, validation, the single compare-and-set writer, the migration and the retirement of the flat gallery group. ⚠️ No story work starts until this phase is done.

### Tests first

- [ ] T005 [P] Write `src/lib/gallery/rules.test.ts` (pure):
  - `liveAlbums` and `livePhotos` ignore `deletedAt`.
  - `effectiveCover`: the chosen cover if it's live, else the first live photo, else null.
  - `applyCreateAlbum` refuses a 7th live album with `full`, but allows it when one of the 6 is deleted.
  - `applyAddPhotos(album, n)` returns `accepted = min(n, 8 − live)` in order and `refusedFull` for the rest, and gives `full` at 0 room.
  - `applyDeletePhoto` on the cover sets `coverPhotoId = null`.
  - `applyReorder` refuses an id set that differs from the live set.
  - `applyUpdateAlbum` with a stale `rev` gives `conflict`, and with a matching one increments `rev`.
  - `applyDeleteAlbum` frees a slot.
  - Retention bound: more than 50 deleted albums or 200 deleted photos drops the oldest and reports their `publicId`s for deletion.
  - `newAlbumId()` matches `ALBUM_ID_PATTERN` and 1,000 calls are unique.
- [ ] T006 [P] Write `src/lib/gallery/schema.test.ts`:
  - title is trimmed and 1–80 characters, with Urdu accepted.
  - description is at most 300 characters and caption at most 150.
  - date accepts empty or a real `YYYY-MM-DD`, and refuses `2026-02-30`, `12/03/2026` and `2026-13-01`.
  - an album id must match the pattern, and a photo id must be a UUID.
  - `addGalleryPhotos` input takes 1–8 photos, each with a `publicId` starting `settings/gallery/`.
  - Error messages equal `galleryCopy`.
- [ ] T007 [P] Write `src/lib/gallery/migrate.test.ts` (pure `migrateFlatGallery`):
  - 0 live images give `albums: []`.
  - 5 images give one "Gallery" album with order and captions kept and `coverPhotoId: null`.
  - 9 images give "Gallery" (8) and "Gallery 2" (1).
  - 48 images give 6 albums and `notMigrated: 0`.
  - 50 images give 6 albums, `notMigrated: 2`, and `discardedPublicIds` holding the last two.
  - Soft-deleted old images go to `retired[]`, not into albums, and don't count toward 48.
  - A `schema: 2` input comes back unchanged with `alreadyMigrated: true`.
- [ ] T008 [P] Write `src/lib/gallery/store.test.ts` (`describeWithDb`, clear `settings` before each):
  - `readGallery()` on a missing document returns empty schema 2 at version 0.
  - `writeWithRetry(mutator)` inserts at version 1, then CAS-updates.
  - A mutator returning an error result writes nothing.
  - Retries: a version moved between the read and the write gives a re-read and a re-apply (simulate with a concurrent write).
  - After 5 lost races it returns `unavailable`.
  - `Promise.all` of 10 `writeWithRetry` calls that each append one album into an empty gallery gives exactly 6 albums stored, 6 successes and 4 `full`.
- [ ] T009 [P] Write `src/lib/gallery/ensure-migrated.test.ts` (`describeWithDb`, mock `deleteUploadedImage`):
  - It migrates a seeded 005 flat document in place, with `version` + 1 and a `data.migration` record.
  - It logs `gallery_migrated` with the counts.
  - It deletes the discarded assets only after the write succeeds.
  - A second call is a no-op.
  - Two concurrent calls leave exactly one migration, and the assets are deleted once.
  - A missing document is left missing (nothing to migrate).
- [ ] T010 [P] Update the 005 tests for the retired flat group (research R12):
  - In `src/lib/settings/defaults.test.ts`, `GROUP_KEYS` equals `["contact","hero","stats","video"]`, and the gallery defaults case is removed.
  - In `src/lib/settings/mutations.test.ts`, remove the flat-gallery cases, re-home the image-verification and folder cases onto the `hero` group, and add "a `gallery` save is refused".
  - In `src/lib/settings/public.test.ts`, remove the gallery shape cases.
  - In `src/app/admin/(dashboard)/settings/actions.test.ts`, add `saveSettingsGroup({ group: "gallery", … })` returns `invalid` and writes nothing.

### Implementation

- [ ] T011 Create `src/lib/gallery/schema.ts` (Zod 4, client-safe) with the album details schema, caption schema, id schemas and one input schema per action in contracts/gallery-actions.md. Messages come from `galleryCopy`. Make T006 pass.
- [ ] T012 Create `src/lib/gallery/rules.ts` (pure, client-safe): `liveAlbums`, `livePhotos`, `effectiveCover`, `newAlbumId` (12 characters `[a-z0-9]` from `crypto.randomUUID()` hex, re-drawn on collision with the existing ids), and one `apply*` function per action returning `{ ok: true, data, discardedPublicIds, summary } | { ok: false, error }`. Also `enforceRetention`, and `toAdminGallery`, `toAdminAlbum` and `toPublicGallery` (live albums with ≥ 1 live photo, in admin order). Reuse `moveItem` from `src/lib/settings/items.ts`. Make T005 pass.
- [ ] T013 Create `src/lib/gallery/store.ts` (server only): `readGallery()` returns `{ data, version }` from `Settings.findById("gallery")`, treating a missing document as empty schema 2 at version 0. `writeWithRetry(mutate, { actorEmail, attempts = 5 })` reads, calls `mutate(data)`, and writes with `Settings.create` at version 0 (duplicate key means retry) or `findOneAndUpdate({ _id, version }, { $set: { data, updatedBy }, $inc: { version: 1 } })`. A null result means retry. After the attempts run out it returns `unavailable`. It returns the mutator's result together with the stored data. This is the only writer of the document (ADR-0005). Make T008 pass.
- [ ] T014 Create `src/lib/gallery/migrate.ts`: pure `migrateFlatGallery(oldData)` per data-model.md "Migration", and `ensureGalleryMigrated(actorEmail = "system:migration")`. The latter reads the raw document and returns at once if it's missing or `schema === 2`. Otherwise it migrates through one compare-and-set on the stored version (a lost race means re-read, then it will see schema 2). After success it calls `deleteUploadedImage` for each discarded id, logs `gallery_migrated`, and returns `{ migrated, notMigrated, albums, alreadyMigrated }`. Make T007 and T009 pass.
- [ ] T015 Retire the flat group (research R12):
  - Remove `"gallery"` from `GROUP_KEYS` in `src/lib/settings/types.ts`, and remove the `gallery` entry in `src/lib/settings/registry.ts`.
  - Remove the `gallery` case, `PublicGallery` and `PublicGalleryImage` from `src/lib/settings/public.ts`.
  - Delete `src/lib/settings/groups/gallery.ts` and `src/components/admin/settings/gallery-uploader.tsx`, and drop the `addMode: "upload"` branch that used it in `list-editor.tsx` if it now has no user.
  - Keep `"gallery"` as an upload `kind` in `src/app/api/admin/settings/uploads/sign/route.ts` and `ImageFieldDef.kind`.
  - In `src/components/admin/settings/settings-nav.tsx`, keep a "Photo gallery" link to `/admin/settings/gallery` (now outside `GROUP_KEYS`), and make it active for `/admin/settings/gallery/*`.
  - Make T010 pass, and fix every TypeScript reference to the removed key (`npx tsc --noEmit`).
- [ ] T016 Create `src/lib/gallery/admin.ts` (server only): `getAdminGallery()` runs `ensureGalleryMigrated()`, then returns `toAdminGallery(readGallery())`. `getAdminAlbum(id)` returns `AdminAlbum | null` (null for a bad format, unknown or deleted id).
- [ ] T017 Create `src/lib/gallery/mutations.ts` (server only), with one function per action in contracts/gallery-actions.md. Each one takes `(input, actorEmail)` and runs `ensureGalleryMigrated()`, then `writeWithRetry(data => apply*(…))`. After a successful write it calls `deleteUploadedImage` for `discardedPublicIds` and returns `{ result, summary }` (the summary carries the album title for logging). `addGalleryPhotos`:
  - verifies each image first with `verifyUploadedImage(publicId, SETTINGS_GALLERY_FOLDER)`. Rejected images go to `rejected` and their assets are deleted. If Cloudinary is unreachable it returns `unavailable` and stores nothing.
  - applies the room check inside the retry loop.
  - deletes the assets of the `refusedFull` images after the write.
  - returns `full` (deleting every given asset) when the room is 0.

**Checkpoint**: `npm test` is green for `src/lib/gallery/**` and the updated 005 suites, and `npx tsc --noEmit` is clean.

---

## Phase 3: User Story 1 — Admin manages albums (P1) 🎯 MVP

**Goal**: the Settings gallery section lists albums. The admin can create (up to 6), rename or edit details, reorder and delete them, and the cap holds on the server.

**Independent Test**: create 3 albums, reorder, rename and delete one, then reload and check. Create up to 6 and confirm the 7th is refused in the UI and by a direct action call (including under `Promise.all`).

### Tests

- [ ] T018 [P] [US1] Write the album-action cases in `src/app/admin/(dashboard)/settings/gallery/actions.test.ts` (`describeWithDb`, mocks from `src/test/admin-session.ts`):
  - For each of `createGalleryAlbum`, `updateGalleryAlbum`, `reorderGalleryAlbums` and `deleteGalleryAlbum`, cover the three cases. No session gives `unauthorized` and nothing stored. A content manager without `settings` gives `forbidden` and nothing stored. A main admin and a content manager with `settings` both succeed.
  - Behaviour: creating when 6 exist gives `full`. Two concurrent creates at 5 give exactly one success. A stale `rev` on update gives `conflict` with the document unchanged. Reorder with a missing id gives `invalid`. Delete frees the slot. `gallery_changed` is logged with `action` and the album title, and never the description.
- [ ] T019 [P] [US1] Write `e2e/admin-gallery-albums.spec.ts` (with a new helper file `e2e/helpers/gallery.ts` for seeding and reading `settings/_id:"gallery"` in the schema 2 or flat shape and clearing it). It covers:
  - Create "Annual Day" with a description and date, which appears last with "0 photos".
  - Create up to 6. The Create button is disabled with the `albumFull` message.
  - After the 6th, the DB (read through `e2e/helpers/gallery.ts`) holds exactly 6 live albums. The direct-call proof of the cap is in T018; Server Actions can't be called from `page.request`.
  - FR-025: leave an unsaved change in **Settings → Contact & social**, open the gallery (accept the unsaved-changes prompt), create an album, and confirm it saves without being blocked.
  - Move album 3 up with the button and with the keyboard (focus the up button, press Enter).
  - Rename in the panel and see it persist after reload.
  - Delete with confirmation. The count is 5 and Create is enabled.
  - Conflict: open Edit in two pages and save both. The second shows `conflict` and keeps its typed value.

### Implementation

- [ ] T020 [US1] Create `src/app/admin/(dashboard)/settings/gallery/actions.ts` (`"use server"`) with the four album actions per contracts/gallery-actions.md. Each one:
  1. calls `requireAdminAccess("settings")`,
  2. parses the input with `schema.ts`,
  3. calls the `mutations.ts` function with `access.session.email`,
  4. on success, revalidates the `SETTINGS_TAG` and `"settings:gallery"` tags with `{ expire: 0 }` and calls `revalidatePath("/resources")` and `revalidatePath("/resources/gallery/[albumId]", "page")`,
  5. logs `gallery_changed`,
  6. returns `GalleryResult`.

  Make the T018 album cases pass.
- [ ] T021 [P] [US1] Create `src/components/admin/gallery/album-panel.tsx` (client). It's a `Sheet` from the right (full width under md) with a react-hook-form + `zodResolver` form for title, description and date. It's used for Create (`rev` absent) and Edit (`rev` given), and guards a close with changes through `use-sheet-dirty-guard.ts`. On `conflict` it shows the message and keeps the values, and field errors appear under their fields.
- [ ] T022 [US1] Create `src/components/admin/gallery/album-list.tsx` (client, takes `initial: AdminGallery`):
  - Album cards in a grid at every width. Each card has the cover thumbnail (or a placeholder block), the title (`dir="auto"`, wrapping), `photoCount`, the date when set, Open (link to `/admin/settings/gallery/<id>`), Edit, Delete (`AdminConfirmDeleteDialog` with `deleteAlbum`), up/down buttons (named with the album title) and a native drag handle (`aria-hidden`).
  - Reorder calls `reorderGalleryAlbums` and rolls back with a toast on failure.
  - The Create button is disabled with the `albumFull` text at 6.
  - Every action result replaces the local state with the returned `AdminGallery`, followed by a 002 toast.
- [ ] T023 [US1] Replace `src/app/admin/(dashboard)/settings/gallery/page.tsx`. It calls `requireAdminPage("settings")`, then `getAdminGallery()`, and renders `<AlbumList initial={…} />` with `export const dynamic = "force-dynamic"` and metadata title "Photo gallery". Make T019 pass.
- [ ] T024 [US1] Add two entries to `EXPECTED` in `src/test/access-inventory.test.ts` (keyed per file, per contracts/access-matrix.md): `"admin/(dashboard)/settings/gallery/page.tsx": { kind: "page", access: "settings" }` (it already exists from 005; keep it) and `"admin/(dashboard)/settings/gallery/actions.ts": { kind: "action", access: "settings" }`. The test checks each exported action in the file, so the photo actions added in US2 are covered automatically. Add the page to `src/app/api/admin/access-matrix.test.ts` if it enumerates pages.

**Checkpoint**: US1 works end to end. The album cap holds by UI and by direct call.

---

## Phase 4: User Story 2 — Admin manages photos in an album (P1)

**Goal**: in an album, the admin uploads several photos at once (up to 8, keeping the ones that fit), captions, reorders, sets the cover and deletes photos.

**Independent Test**: upload 5, then 6 more. Exactly 3 are added with the "not added" message. Caption, reorder, make cover, then delete the cover and the next photo becomes the cover. Two concurrent uploads never exceed 8.

### Tests

- [ ] T025 [P] [US2] Extend `src/app/admin/(dashboard)/settings/gallery/actions.test.ts` with the photo actions. Cover the three access cases for each of `addGalleryPhotos`, `updateGalleryPhoto`, `reorderGalleryPhotos`, `setGalleryCover` and `deleteGalleryPhoto`, and the following behaviour:
  - 5 photos then 6 give `added: 3, refusedFull: 3`, and the 3 refused assets are deleted.
  - At 8, the call gives `full` and every given asset is deleted.
  - `Promise.all` of two 5-photo calls into an empty album gives 8 stored in total, 2 refused and assets deleted.
  - A failed verification gives an entry in `rejected`, with the others added.
  - Cloudinary unreachable gives `unavailable` and nothing stored.
  - The selection order is kept.
  - Deleting the cover makes the next photo the cover.
  - `setGalleryCover` on a deleted photo gives `not_found`.
  - Captions longer than 150 characters give `invalid`.
- [ ] T026 [P] [US2] Write `e2e/admin-gallery-photos.spec.ts` (stub the Cloudinary upload through the `e2e/helpers/settings.ts` stub, with `NEWS_COVER_VERIFY=skip`). It covers:
  - Select 5 fixtures and see 5 progress rows and then 5 cards.
  - Select 6 more and see 3 added, the summary message, and the uploader disabled with `photosFull`.
  - A 6 MB file and a renamed PDF are listed with `imageLimits`, and the other photos are unchanged.
  - Edit a caption, reload, and it persists.
  - Move a photo with the buttons and with the keyboard.
  - Make cover, then the badge moves, and the album list shows the new cover.
  - Delete the cover with confirmation, and the next photo is the cover.
  - Direct call: the 9th photo is refused.

### Implementation

- [ ] T027 [US2] Add the five photo actions to `src/app/admin/(dashboard)/settings/gallery/actions.ts`, with the same order of work as T020. `addGalleryPhotos` returns `{ album, added, refusedFull, rejected }`. Make the T025 cases pass.
- [ ] T028 [P] [US2] Create `src/components/admin/gallery/album-uploader.tsx` (client), adapted from the deleted `gallery-uploader.tsx`:
  - a multi-file input (`accept="image/jpeg,image/png,image/webp"`) with `precheckImage` for each file, keeping at most `room` files in selection order (the rest are counted as refused-for-space at once).
  - `requestSignature("/api/admin/settings/uploads/sign", "gallery")` and `uploadToCloudinary`, 3 in parallel, with progress rows for each file.
  - when every file has settled, one `addGalleryPhotos` call with the successful uploads in selection order, then a summary notice and toast from `addedSummary` plus a list of each rejected file and its reason.
  - disabled with `photosFull` at 0 room.
- [ ] T029 [P] [US2] Create `src/components/admin/gallery/album-photos.tsx` (client, takes `initial: AdminAlbum`). It shows photo cards (thumbnail through `cloudinaryLoader`, a caption input with `maxLength` 150 and a counter that saves on blur or Enter through `updateGalleryPhoto`, a "Cover" badge or a "Make cover" button, up/down buttons named with the position, a drag handle, and Delete with `AdminConfirmDeleteDialog`). Above the cards it shows the album header (title, "Edit details" opening `AlbumPanel`, `room`), and it hosts `AlbumUploader`. The state is replaced from each action's returned `AdminAlbum`.
- [ ] T030 [US2] Create `src/app/admin/(dashboard)/settings/gallery/[albumId]/page.tsx`. It calls `requireAdminPage("settings")`, then `getAdminAlbum(params.albumId)`, which calls `notFound()` when null, and renders a back link to `/admin/settings/gallery` plus `<AlbumPhotos initial={…} />`. It uses `generateMetadata` for the album title and `dynamic = "force-dynamic"`. Add `"admin/(dashboard)/settings/gallery/[albumId]/page.tsx": { kind: "page", access: "settings" }` to `EXPECTED` in `src/test/access-inventory.test.ts`. Make T026 pass.

**Checkpoint**: US1 and US2 give the full admin flow, and both caps hold under concurrency.

---

## Phase 5: User Story 3 — Existing photos move into albums (P1)

**Goal**: at release, the flat gallery becomes "Gallery", "Gallery 2" … (8 each, at most 48). Photos past 48 are discarded and reported, the run is idempotent, and it runs by script or lazily.

**Independent Test**: seed 10 live photos and 1 deleted one, then run the script. You get "Gallery" (8) and "Gallery 2" (2), the deleted one retired, and the report printed. Re-running changes nothing. Seed 50 and the report says 2 were not migrated.

### Tests

- [ ] T031 [P] [US3] Write `scripts/migrate-gallery.test.ts` (in the style of `scripts/seed-admin.test.ts`, `describeWithDb`). The script's `run()`:
  - prints `Migrated 10 photo(s) into 2 album(s); 0 photo(s) were not migrated.` for 10.
  - prints `Migrated 48 photo(s) into 6 album(s); 2 photo(s) were not migrated.` for 50.
  - prints `Gallery already migrated; nothing to do.` on a second run.
  - prints `No gallery to migrate.` when there's no document.
  - exits with 0 in every case above, and 1 with a message when the database is unreachable.
- [ ] T032 [P] [US3] Write `e2e/admin-gallery-migration.spec.ts` (serial admin project; no sign-in needed) for the lazy path. Seed the flat shape with 10 captioned photos through `e2e/helpers/gallery.ts` and open `/resources`. Two album cards show ("Gallery" 8 photos, "Gallery 2" 2 photos), and the first album page shows the captions in the old order. The DB now has `schema: 2` and `data.migration`.

### Implementation

- [ ] T033 [US3] Create `scripts/migrate-gallery.ts` (`tsx`, same env loading as `scripts/seed-admin.ts`). It exports `run()`, which connects, calls `ensureGalleryMigrated("system:migration")`, prints the report line, and disconnects. It has a CLI entry. Add `"migrate:gallery": "tsx scripts/migrate-gallery.ts"` to `package.json` scripts. Make T031 pass.
- [ ] T034 [US3] Add a "Release step" note for `npm run migrate:gallery` to `docs/architecture.md` (deploy section), including that the lazy fallback exists and that photos past 48 are discarded (spec FR-023).

**Checkpoint**: migration is proven by unit, DB, script and E2E tests.

---

## Phase 6: User Story 4 — Visitors browse the gallery (P1)

**Goal**: `/resources` shows the `#photo-gallery` section with album cards. Each album has its own page at `/resources/gallery/<id>`, and the full-screen viewer works by keyboard and touch. Empty albums and an empty gallery are hidden.

**Independent Test**: with two albums (one empty), `/resources` shows one card. Open it, open a photo, use → to the last, Escape, then Back returns to `#photo-gallery`. Swipe on mobile. An empty gallery shows no section, and a deleted album's address gives a 404.

### Tests

- [ ] T035 [P] [US4] Write `src/lib/gallery/public.test.ts`:
  - The public shape only includes live albums with ≥ 1 live photo, in admin order, with no `rev`, `deletedAt` or `retired`.
  - `getPublicAlbum` returns null for a bad format, an unknown, deleted or empty album.
  - A thrown or timed-out (> 3 s, fake timers) read returns the last good value, else `{ albums: [] }`, never throws, and logs `gallery_read_failed`.
  - A failed read isn't cached.
  - The migration check reads the database at most once per process: after a first call that sees `schema: 2`, ten further `getPublicGallery()` calls within the cache window make no `Settings.findById` call (spy on it).

  Mock `unstable_cache` to call through, as `src/lib/settings/public.test.ts` does.
- [ ] T036 [P] [US4] Write `src/components/gallery/photo-viewer.test.tsx`:
  - It opens on the given index with "3 of 8" and the caption.
  - → and ← move, with Previous hidden on the first photo and Next hidden on the last.
  - Escape calls `onClose`.
  - A pointer swipe of more than 50 px moves, and less than that doesn't.
  - Under reduced motion no transition class is applied.
- [ ] T037 [P] [US4] Write `e2e/admin-gallery-public.spec.ts` (serial admin project, no sign-in needed; seed through `e2e/helpers/gallery.ts`). It covers:
  - The cards appear in admin order with cover, title, count and date, and the empty album isn't shown.
  - The card link goes to `/resources/gallery/<id>` (and not the `[slug]` placeholder).
  - The album page shows the `PageBanner` `h1` "Photo Gallery" with the breadcrumb "Home » Resources » Photo Gallery" (as in `screenshots/das.edu.pk_resources_photo-gallery_*.png`), then the album title `h2`, description and grid.
  - `/resources` shows the `PageBanner` "Resources" and then the gallery section.
  - Clicking photo 1, then ArrowRight × 7, shows "8 of 8". Escape closes, and focus is on photo 1.
  - `page.goBack()` lands on `/resources` with the `#photo-gallery` hash.
  - A mobile context (`hasTouch`) swipes and taps Close.
  - With an empty gallery, `/resources` has no "Photo Gallery" heading.
  - A deleted album's address and a malformed id each give a 404 status.
  - `/resources/gallery` redirects to `/resources#photo-gallery`, and so does `/resources/photo-gallery`.
  - Menu → Resources → Photo Gallery lands on `#photo-gallery`.
  - Long (80-character) and Urdu titles wrap, with no horizontal scroll at 375.

### Implementation

- [ ] T038 [US4] Create `src/lib/gallery/public.ts`, mirroring `src/lib/settings/public.ts`:
  - `getPublicGallery()` runs `ensureGalleryMigrated()` outside the cache (wrapped in try, since failure mustn't break the read) **only while the in-process `migrationDone` flag is false**. `ensureGalleryMigrated()` in `src/lib/gallery/migrate.ts` sets that flag once it sees or writes `schema: 2`, so after the first check the public path makes no database read outside the cache. Then it uses an `unstable_cache` reader keyed `["settings","gallery-albums"]`, with tags `SETTINGS_TAG` and `"settings:gallery"` and `revalidate` 60.
  - It has a 3 s timeout and a last-good fallback, logs `gallery_read_failed`, and uses `unstable_rethrow` for Next control flow.
  - `getPublicAlbum(id)` checks `ALBUM_ID_PATTERN` first, then looks the album up in `getPublicGallery()`.

  Make T035 pass.
- [ ] T039 [P] [US4] Create `src/components/gallery/album-card.tsx` (server). It's one `<Link>` to `/resources/gallery/<id>` containing a `CoverImage`-style `next/image` with `loader={cloudinaryLoader}` and `alt` equal to the title, then the title (`dir="auto"`, `line-clamp-3`), `photoCount` and `formatAlbumDate` when set. Styling uses tokens from `research/design-tokens.md`.
- [ ] T040 [P] [US4] Create `src/components/gallery/gallery-section.tsx` (server, async). It calls `getPublicGallery()`, returns `null` when there are no albums, and otherwise renders `<section id="photo-gallery" aria-labelledby="photo-gallery-heading">` with the `h2` `sectionHeading` and a grid (1 / md:2 / lg:3 columns) of `AlbumCard`. Document in a comment that feature 016 adds `#downloads` and `#our-books` as siblings, and that this component and its id must not change.
- [ ] T041 [P] [US4] Create `src/components/gallery/photo-viewer.tsx` (client). It uses `ui/dialog.tsx` full screen with `aria-label` `viewer.label(title)`, and shows an `object-contain` `next/image` (with `cloudinaryLoader`, and `priority` for the current photo only), the caption (`dir="auto"`) and the position. Previous and Next are hidden at the ends and don't wrap. It has a Close button, ←/→ on `keydown`, a pointer-events swipe (> 50 px horizontal, less than 45° off axis), a click on the backdrop to close, hidden `<link rel="preload">`-equivalent neighbour images, and no transition under `prefers-reduced-motion`. Make T036 pass.
- [ ] T042 [P] [US4] Create `src/components/gallery/album-photo-grid.tsx` (client). It shows a grid of photo buttons (lazy `next/image`, `alt` = caption or `photoAlt(title, n)`) and holds the `openIndex` state for `PhotoViewer`. Focus returns to the button that opened the viewer (Radix does this when the trigger is the button, so verify it).
- [ ] T043 [US4] Replace `src/app/(public)/resources/page.tsx` with a minimal Resources page. It renders `PageBanner` (`src/components/site-shell/page-banner.tsx`) with `title` "Resources", `trail` `["Resources"]` and the site's `breadcrumbHome` copy, then `<GallerySection />`, and nothing else (016 owns the final banner). Set `export const revalidate = 60`, and add `metadata` (title "Resources").
- [ ] T044 [US4] Create `src/app/(public)/resources/gallery/[albumId]/page.tsx`. It calls `getPublicAlbum` and then `notFound()` when that returns null. It reproduces the reference Photo Gallery page frame (`screenshots/das.edu.pk_resources_photo-gallery_.png`, `…_(iPad Pro).png`, `…_(Moto G Power).png`): `PageBanner` with `title` "Photo Gallery", `trail` `["Resources", "Photo Gallery"]` and `backgroundImage={photoGalleryBanner ?? undefined}`, where `photoGalleryBanner` is the constant from `src/content/gallery.ts` (T002). No file check at runtime: the constant is `null` until the client supplies the photograph, giving the `bg-primary` fallback. List it in the placeholder-content notes in `docs/architecture.md`. Below the banner it renders a back link to `/resources#photo-gallery` (`backToGallery`), the album title as an `h2` (`dir="auto"`), the description and date when set, and `<AlbumPhotoGrid album={…} />`. Compare the banner and breadcrumb against the three screenshots at 1440, 768 (iPad) and 375 (Moto). `generateMetadata` gives the title and an Open Graph image from `ogImageUrl(cover.url)`. Set `revalidate = 60`, and have no `generateStaticParams` (albums change).
- [ ] T045 [P] [US4] Create `src/app/(public)/resources/gallery/page.tsx`, which does `redirect("/resources#photo-gallery")`. In `next.config.ts`, add a permanent redirect from `/resources/photo-gallery` to `/resources#photo-gallery`. In `src/content/site-shell.ts`, change the "Photo Gallery" menu `href` to `/resources#photo-gallery`, and update the 001 tests or snapshots that assert the old href (`grep -rn "resources/photo-gallery" src e2e`).
- [ ] T046 [US4] Make T037 pass. Verify that the static `gallery` segment wins over `[slug]`, and that the 001 E2E for the other `/resources/[slug]` placeholders still passes.

**Checkpoint**: the public gallery is complete, and 016 can add sections without touching `GallerySection`.

---

## Phase 7: User Story 5 — Access, media rules and performance (P2)

**Goal**: every gallery entry point proves the three access cases, uploads are verified by content, and photos load lazily.

**Independent Test**: signed out, a content manager without `settings`, and one with it, against both admin pages and all nine actions. A renamed non-image is refused. Below-the-fold photos aren't requested on the first load.

### Tests

- [ ] T047 [P] [US5] Write `e2e/admin-gallery-access.spec.ts`. Both `/admin/settings/gallery` and `/admin/settings/gallery/<id>` redirect to login when signed out, and to `/admin?denied=1` with the no-access message for a content manager without `settings`. They render for a content manager with `settings` and for the main admin. Add both pages to `e2e/admin-roles-access-matrix.spec.ts`.
- [ ] T048 [P] [US5] Add to `e2e/admin-gallery-public.spec.ts`: on an album page with 8 photos at 375 px, record image requests on load. The photos below the fold aren't requested until scrolled, and the viewer requests only the current photo and its neighbours. FR-018: every delivered gallery image URL carries the Cloudinary delivery transformation (`f_auto,q_auto,c_limit,w_<n>`), and `<n>` is no larger than the rendered width × device pixel ratio rounded up to the next `next/image` size.

### Implementation

- [ ] T049 [US5] Confirm that the three gallery files (both pages and `actions.ts`) are in `EXPECTED` (T024, T030) and that `src/test/access-inventory.test.ts` passes. It fails if any file under `settings/gallery/` lacks an entry, or if any of the nine exported actions doesn't call `requireAdminAccess("settings")`. Fix any gap.
- [ ] T050 [US5] Make T047 and T048 pass. If the lazy loading check fails, set `loading="lazy"` and `sizes` explicitly on the grid images and remove any `priority` outside the viewer's current photo.

**Checkpoint**: Constitution XI access matrix complete for the gallery.

---

## Phase 8: Polish & cross-cutting

- [ ] T051 [P] Rewrite or remove the 005 E2E that assume the flat gallery:
  - `e2e/admin-settings-gallery.spec.ts`: delete it, since its coverage has moved to T019 and T026.
  - `e2e/admin-settings-uploads.spec.ts`: re-home the gallery upload rejection cases onto the hero group, or delete them where T026 covers them.
  - `e2e/admin-settings-layout.spec.ts`: remove `"gallery"` from `GROUPS`, and move the seeding of the gallery onto `e2e/helpers/gallery.ts`.
  - `e2e/admin-settings-access.spec.ts`: remove `"gallery"` from `GROUP_PATHS` and the key loop, and keep the sign-route `kind: "gallery"` checks.
  - `e2e/helpers/settings.ts`: drop `"gallery"` from `SettingsGroupKey`.
- [ ] T052 [P] Write `e2e/admin-gallery-layout.spec.ts`. The album list, the album screen and the details panel show no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`) and no overlapping controls at 375, 768, 1024 and 1440px, and at the reference site's own layout breakpoints (Constitution XI; `research/design-tokens.md` "Container widths & breakpoints": 480, 640, 782 and 1280px). Check with an 80-character title, an Urdu title and caption, 1 photo and 8 photos. Add the same checks for `/resources` and the album page to `e2e/admin-gallery-public.spec.ts`.
- [ ] T053 [P] Accessibility pass. Up/down buttons have names including the item ("Move Annual Day up", "Move photo 3 up"), and reorder results are announced through an `aria-live="polite"` region. Drag handles are `aria-hidden`. Captions and titles use `dir="auto"`. The viewer's buttons have names from `galleryCopy`/`content/gallery.ts`. Add assertions to `e2e/admin-gallery-photos.spec.ts` and `e2e/admin-gallery-public.spec.ts`.
- [ ] T054 [P] Update `docs/architecture.md` with a "Gallery albums (007)" section: the one document with compare-and-set and the retry vs `rev` policies (link ADR-0005 and its validity condition on the 6/8 caps), `src/lib/gallery/` as the only writer, the public routes, and the migration release step. Add `src/lib/gallery/`, `src/components/admin/gallery/` and `src/components/gallery/` to "Folder layout".
- [ ] T055 [P] Add the 007 rows to `specs/011-roles-and-users/contracts/access-matrix.md`, pointing to `specs/007-gallery-albums/contracts/access-matrix.md`. In `specs/005-settings/spec.md`, add a note under Overview that the Photo gallery group is superseded by 007.
- [ ] T056 Run the full suites in sequence, never alongside a build: `npm test`, then `npx playwright test --project=admin`, `--project=chromium` and `--project=forms`. Diff the admin failures against the known pre-existing baseline and fix only new ones. Then run `npm run build` on its own. Record the results in `specs/007-gallery-albums/quickstart.md` under "Last verified".
- [ ] T057 Walk through `specs/007-gallery-albums/quickstart.md` §1–§6 by hand against a dev server and tick each item. Time §3 step 0 (SC-005: create an album, upload 5 photos and set a cover in under 3 minutes) and record the time under "Last verified".

---

## Dependencies & execution order

### Phases

- **Setup (T001–T004)**: no dependencies, all [P].
- **Foundational (T005–T017)**: after Setup, and it blocks every story.
  - Tests T005–T010 [P] first.
  - T011 ∥ T012 → T013 → T014 → T016, T017. T015 depends only on T010 and can run alongside T011–T014.
- **US1 (T018–T024)**: after Foundational. It's the MVP and must come before US2's UI (US2 reuses `AlbumPanel` and the actions file).
- **US2 (T025–T030)**: after US1 (it shares `actions.ts`, `actions.test.ts` and the album list's cover display).
- **US3 (T031–T034)**: after Foundational only, independent of US1 and US2. T032 needs US4's T043 and T044 to render, so run it after them or assert through the DB until then.
- **US4 (T035–T046)**: after Foundational only. The public side doesn't need the admin UI, because the tests seed through `e2e/helpers/gallery.ts` (created in T019; create it first if US4 runs before US1).
- **US5 (T047–T050)**: after US1, US2 and US4.
- **Polish (T051–T057)**: after the stories to ship. T051 must land in the same change as T015, or the 005 E2E will fail.

### Story independence

| Story | Needs beyond Foundational | Blocks |
|---|---|---|
| US1 | — | US2, US5 |
| US2 | US1 (actions file, panel) | US5 |
| US3 | — (E2E needs US4 pages) | — |
| US4 | `e2e/helpers/gallery.ts` | US5 (T048) |
| US5 | US1, US2, US4 | — |

## Parallel examples

**Setup**: T001 ∥ T002 ∥ T003 ∥ T004.

**Foundational tests**: T005 ∥ T006 ∥ T007 ∥ T008 ∥ T009 ∥ T010. Then T011 ∥ T012 ∥ T015.

**US1**: T018 ∥ T019, then T020 → (T021 ∥ T022) → T023 → T024.

**US2**: T025 ∥ T026, then T027 → (T028 ∥ T029) → T030.

**US4**: T035 ∥ T036 ∥ T037, then T038 → (T039 ∥ T040 ∥ T041 ∥ T042 ∥ T045) → T043 → T044 → T046.

**Polish**: T051 ∥ T052 ∥ T053 ∥ T054 ∥ T055, then T056 → T057.

## Implementation strategy

1. **MVP**: Setup, then Foundational, then US1. Admins can create and manage up to 6 albums, and the server cap is proven. Ship it only together with T051, because the flat gallery screen has been replaced.
2. **Admin complete**: add US2, and both caps then hold under concurrency.
3. **No content lost**: add US3. This must be in the release that first deploys Foundational T015 (the retired group). Otherwise existing flat photos are unreadable until the lazy migration runs, which happens anyway on first read.
4. **Public**: add US4, giving `/resources`, the album pages and the viewer.
5. **Hardening**: US5, then Polish, with full suites in sequence.

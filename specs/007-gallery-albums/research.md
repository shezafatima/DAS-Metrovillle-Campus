# Research: Gallery Albums (007)

All Technical Context unknowns resolved below. Format per decision: Decision / Rationale / Alternatives considered.

## R1 — Where albums are stored

**Decision**: Keep the gallery as **one document** in the existing `settings` collection (`_id: "gallery"`), with a new data shape `{ schema: 2, albums: Album[], retired: RetiredImage[] }`. Albums embed their photos. Every write is a **version compare-and-set** on that one document (the 005 `version` counter).

**Rationale**:
- The caps (6 albums, 8 photos) are rules over a *set*. With all albums in one document, "check the count, then write" happens against one version: if anything else wrote first, the version no longer matches and nothing is stored. This makes the caps hold under simultaneous requests (FR-006, FR-011, FR-035) without transactions, counters or locks. 005 already relies on the same guarantee and avoided assuming transactions.
- Size is tiny: at most 6 live albums × 8 live photos, plus retained deleted items (bounded, R4). That is far below the document limit.
- The migration (R6) becomes one atomic rewrite of one document.

**Alternatives considered**:
- *Separate `albums` and `photos` collections*: natural for large galleries, but enforcing "≤ 8 photos per album" across concurrent inserts needs a transaction or a counter document with `$inc` + conditional rollback. Both are more code and more failure modes for a gallery capped at 48 photos.
- *Album documents with embedded photos, conditional `$push` filtered on array length* (`{ "photos.8": { $exists: false } }`): enforces the photo cap atomically per album, but soft-deleted photos stay in the array so length ≠ live count, and the 6-album cap still needs a cross-document rule. Rejected.

## R2 — Concurrency: caps vs. edit conflicts

**Decision**: Two kinds of write:
1. **Structural actions** (create album, add photos, delete, reorder, set cover, caption) re-read and retry on a version mismatch, up to 10 attempts with a short random pause between them (5 could run out before the cap is reached when 10 writers race). Each attempt re-applies the rule to the fresh document, so the cap check always runs against the latest state. A caller whose attempt would exceed a cap gets the "full" result. It is never merged past the cap.
2. **Album detail edits** (title, description, date) carry the album's own `rev` (from when the panel was opened). If the stored album's `rev` differs, the edit is refused with the 005 conflict message (FR-026). Unrelated writes to other albums don't cause false conflicts.

**Rationale**: Retrying structural actions means two admins working on *different* albums never see spurious "someone else changed this" errors, while the cap is still decided serially. Detail edits are the only place where one admin's typing could silently overwrite another's, so only they use the refuse-on-conflict rule the spec requires.

**Alternatives considered**: refuse *every* action on any version mismatch (the 005 group rule). This is simpler, but two admins uploading to different albums would keep failing each other, which the brief's "two admins uploading at once" scenario makes likely. Rejected.

## R3 — Save model (immediate, per action)

**Decision**: Each album or photo action is its own Server Action call that saves immediately and shows a 002 toast. There is no group-level "Save" button on the gallery screens, and so no unsaved-changes guard, except in the album details panel, which uses the 011 panel's close-with-changes warning.

**Rationale**: Already decided in the spec's Clarifications. The caps and the cover rule have to be decided when the action happens, and an upload that has succeeded must be stored (not held in a form) so a failed later file can't discard it (FR-016).

**Alternatives considered**: the 005 staged-form model. Rejected by the spec.

## R4 — Soft delete and retained items

**Decision**: Albums and photos carry `deletedAt`. A deleted album keeps its photos inside it, and they count as deleted with it. Counting for the caps, the public read and the admin lists use live items only. Retained deleted items are bounded: at most 50 deleted albums and 200 deleted photos in total (across all albums) are kept. Past that, the oldest are dropped from the document and their Cloudinary assets deleted.

**Rationale**: This matches 005 FR-033 and the spec ("recoverable", developer restore, no restore screen). The bound keeps the one document from growing without limit. 005 uses the same approach with `MAX_DELETED_RETAINED`.

**Alternatives considered**: hard delete. Rejected, because the brief says deletes are recoverable.

## R5 — Album address

**Decision**: Each album gets a stable, URL-safe, random `id` when it's created: 12 characters from `[a-z0-9]`, taken from `crypto.randomUUID()`. The public address is `/resources/gallery/<id>`. It never changes on rename (FR-029).

**Rationale**: Titles may be Urdu, may be renamed, and may collide, so a title-based slug would break links on rename. An opaque id is stable and trivially validated (`^[a-z0-9]{12}$`), and anything else is a 404 without a database read.

**Alternatives considered**:
- *Slug plus id* (`annual-day-k3f9…`): prettier, but needs redirect handling on rename, and Urdu slugs transliterate poorly. It can be added later without breaking the id form.
- *Sequential numbers*: they leak the count and get reused after deletes. Rejected.

## R6 — Migration from the flat gallery

**Decision**: One pure function `migrateFlatGallery(oldData) → { data, migrated, notMigrated, discardedPublicIds }`, applied by `ensureGalleryMigrated()`:
- If the stored document is already `schema: 2`, do nothing (idempotent, FR-021).
- Otherwise take the old live images in order, chunk them into albums of 8 named "Gallery", "Gallery 2" … "Gallery 6", keep the captions, and leave the cover as the default (the first photo). Everything past the first 48 is **not migrated**: removed from the document and its Cloudinary asset deleted. There's no overflow storage.
- Old **soft-deleted** images are not moved (FR-020). They are kept in `retired[]` so they stay developer-recoverable exactly as they were under 005, and they are never shown.
- The rewrite is one compare-and-set on the old version. A concurrent migration loses the race and re-reads the already-migrated document.

`ensureGalleryMigrated()` runs in two places:
1. **At release**, via `npm run migrate:gallery` (`scripts/migrate-gallery.ts`, same `tsx` pattern as `seed:admin`). It prints `Migrated N photo(s) into K album(s); M photo(s) were not migrated.`
2. **Lazily**, at the start of the gallery admin read and the public gallery read, so the site is correct even if the release step is forgotten. An in-process flag makes this a one-time check per server process (R8). It logs a `gallery_migrated` security event with the same counts.

**Rationale**: The spec requires the report of "how many were not migrated". The script gives the release operator that report directly, and the lazy path protects against a skipped step. Both use the same function, so they can't behave differently.

**Alternatives considered**:
- *Script only*: if it's forgotten, the old shape is unreadable by the new code and the gallery vanishes. Rejected.
- *Lazy only*: nobody sees the report unless they read the logs. Kept as the fallback, not the primary.
- *Keep the overflow in a hidden store*: explicitly refused by the owner (spec Clarifications).

## R7 — Uploads, verification and cap enforcement for a multi-file selection

**Decision**:
1. The browser pre-checks type and size (the existing `precheckImage`) and takes at most `room = 8 − live photos` files from the selection, in selection order. The rest are refused at once with the "album full" count message.
2. Each file is signed through the existing `POST /api/admin/settings/uploads/sign` (kind `gallery`, folder `settings/gallery`) and uploaded directly to Cloudinary, 3 at a time. This reuses `lib/uploads/direct-upload.ts` and the existing incoming transformation `c_limit,w_2400,h_2400`, which does the resizing.
3. When all uploads in the selection have settled, **one** `addGalleryPhotos({ albumId, photos })` call sends the successful ones in selection order.
4. The server verifies each new image (`verifyUploadedImage`: real format, size, folder). It then applies the cap against the fresh document inside the retry loop (R2), accepts the first *k* that fit and refuses the rest with reason `full`. Every refused or rejected image is deleted from Cloudinary, so no orphan is left.
5. The result lists `added`, `refusedFull` and `rejected` (with reasons), and the UI's toast and notice report them (FR-012).

**Rationale**: One server call per selection keeps the selection order stable, even though the uploads run in parallel. The server-side cap is the authority, so a second admin's simultaneous upload can only reduce `k`, never exceed 8 (FR-011). An upload that fails in the browser never reaches the server, and the album is untouched (FR-016).

**Alternatives considered**: one server call per file as each finishes. That's simpler, but it breaks selection order under parallel uploads and makes the "N added, M refused" message harder to put together. Rejected.

**Compression**: Cloudinary delivery already applies `f_auto,q_auto` plus a width limit through `cloudinaryLoader` (003), and storage is capped at 2400px. This meets "compressed and resized on upload" (FR-018) with no new code.

## R8 — Public reading and caching

**Decision**: `getPublicGallery()` in `lib/gallery/public.ts` mirrors 005's `getPublicSettings`: `unstable_cache` for 60 s, tagged `settings` and `settings:gallery`, a 3 s timeout, a last-good value held in the process, and it never throws. The lazy migration check (R6) must not add a database read to every request: `ensureGalleryMigrated()` sets an in-process `migrationDone` flag once it has seen (or written) `schema: 2`, and the public reader calls it only while that flag is false. After the first successful check the public path makes no database read outside the 60 s cache. Every successful admin gallery action revalidates both tags, the `/resources` path and the album's path. The public shape contains only live albums that have ≥ 1 live photo, with their live photos (FR-003, FR-031).

**Rationale**: It's the same caching behaviour, fallback and freshness rule (≤ 60 s, instant on save) the rest of Settings already has, and `cacheComponents` stays off.

**Alternatives considered**: reading the database on each request. That breaks the 005 performance rule. Rejected.

## R9 — Public routes

**Decision**:
- **Page frame from the reference**: the reference Photo Gallery page (`screenshots/das.edu.pk_resources_photo-gallery_*.png`) has a banner titled "Photo Gallery" over a camera photograph, with the breadcrumb "Home » Resources » Photo Gallery". Its gallery module is broken. The album page uses the existing `PageBanner` (`src/components/site-shell/page-banner.tsx`) with `title` "Photo Gallery", `trail` `["Resources", "Photo Gallery"]` and `backgroundImage` `/images/banners/photo-gallery.jpg`. Until the client supplies that photograph, `backgroundImage` is omitted (the banner's `bg-primary` fallback) and listed as placeholder content. `/resources` uses `PageBanner` with `title` "Resources" and `trail` `["Resources"]`, and 016 owns its final banner.
- `src/app/(public)/resources/page.tsx` stops being a placeholder. It renders a minimal Resources page with only `<GallerySection id="photo-gallery">`. The section returns `null` when there are no albums to show (FR-031, FR-033).
- `src/app/(public)/resources/gallery/[albumId]/page.tsx` is the album page. `notFound()` is called for an invalid id format, an unknown album, a deleted album or an empty album.
- `src/app/(public)/resources/gallery/page.tsx` redirects to `/resources#photo-gallery`, so the bare `/resources/gallery` URL isn't a 404.
- The static `gallery` segment takes precedence over the existing `[slug]` placeholder, which is standard App Router matching (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`). An E2E check confirms `/resources/gallery/<id>` doesn't render the `[slug]` placeholder.
- The site-shell menu item "Photo Gallery" (`src/content/site-shell.ts`, currently `/resources/photo-gallery`) changes to `/resources#photo-gallery`, and `next.config.ts` gets a permanent redirect `/resources/photo-gallery → /resources#photo-gallery` so old links land correctly. Feature 016 keeps both.

**Rationale**: This satisfies the owner's decision (spec Clarifications) that 016 **extends** this page with `#downloads` and `#our-books` around the gallery section. So the gallery lives in its own section component with a fixed anchor, and 016 only adds siblings.

**Alternatives considered**: leaving the menu pointing at the `[slug]` placeholder. That would mean the menu and Home's icon link disagree. Rejected.

## R10 — Public viewer

**Decision**: The album page shows a photo grid of `next/image` with `loader={cloudinaryLoader}`. Images are lazy by default, so photos below the fold load on scroll (FR-032). Choosing a photo opens a full-screen viewer built on the existing `ui/dialog.tsx` (Radix). That dialog already gives focus trapping, Escape to close and focus restoring to the trigger (FR-030). The viewer adds left/right arrow keys, previous/next buttons (hidden at the ends), a "3 of 8" indicator, the caption, and swipe through pointer events (a horizontal move > 50 px, less than 45° off axis). There are **no new dependencies**.

**Rationale**: It builds on primitives that already pass accessibility checks in the admin, and lightbox libraries would add weight and styling to override.

**Alternatives considered**: a lightbox library. That breaks Constitution II's fixed-stack preference with no need for it. Rejected.

## R11 — Admin screens

**Decision**:
- `/admin/settings/gallery` is the album list. It uses cards at every width, like the 005 gallery, each with cover, title, "N photos", date, up/down buttons, native drag, Open, Edit and Delete. The Create button is disabled at 6 with the FR-007 message. Create and Edit open the 011 right-hand `Sheet` panel with the album details form (react-hook-form + Zod, same as `UserPanel`).
- `/admin/settings/gallery/[albumId]` is the album screen. It has the photo cards grid (thumbnail, caption input saved on blur/Enter, "Cover" badge or "Make cover", up/down, drag, Delete), the multi-file uploader (adapted from `GalleryUploader`) with remaining room shown, and the disabled state at 8.
- Both pages call `requireAdminPage("settings")`. A missing or deleted album gives `notFound()`.
- Deletes use `AdminConfirmDeleteDialog`, the confirm-only dialog lifted in 005.

**Rationale**: It reuses the 002, 005 and 011 patterns, and one URL per screen keeps the back button and deep links working.

## R12 — Retiring the flat gallery group

**Decision**: Remove `gallery` from the definition-driven Settings engine: `GROUP_KEYS` becomes `contact, hero, stats, video`. `groups/gallery.ts` and the gallery branch in `public.ts`'s `toPublicShape` are deleted. The Settings nav keeps a "Photo gallery" entry pointing at `/admin/settings/gallery`, which is now the album list. `saveSettingsGroup` refuses `gallery`, because the key is no longer in the registry. The 005 tests that exercise the flat gallery are rewritten to target the album model, or deleted where they only test the removed flat behaviour. Each removal is listed in tasks.

**Rationale**: FR-022 says the old flat list must no longer be shown or editable. Two paths that could both write the `gallery` document (the group save and the album actions) would corrupt it, so the old path must be closed.

**Alternatives considered**: keeping the gallery group and adding "albums" as a list-of-lists field type in the engine. The engine has no nested lists, per-action saving or caps across concurrent writers, and adding them would complicate every group. Rejected.

## R13 — Logging

**Decision**: Add a security event type `gallery_changed` with a new `action` field (`album_created | album_updated | album_reordered | album_deleted | photos_added | photo_updated | photos_reordered | cover_changed | photo_deleted`) and reuse `target` for the album title. Add `gallery_migrated` with `outcome: "migrated=N;not_migrated=M"`, and `gallery_read_failed` for the public fallback. Captions and descriptions are never logged (FR-004).

**Rationale**: It uses the existing one-line JSON log format (002), with the album name as the only content, as the spec requires.

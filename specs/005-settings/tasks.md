---
description: "Task list for 005 Settings"
---

# Tasks: Settings

**Input**: Design documents from `specs/005-settings/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Prerequisites**: 011 roles-and-users in the working tree (`requireAdminPage`/`requireAdminAccess`, `settings` key, `Sheet`, access inventory/matrix tests).

**Tests**: REQUIRED. The spec's Acceptance and Constitution XI ask for one E2E per story, three access cases for every page/route/action, upload-rejection tests and last-visible-slide tests. Write each story's tests first and see them fail.

**Organization**: tasks are grouped by user story (spec.md US1–US7) so each can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US7 from spec.md
- Paths are repo-relative (single Next.js app, `src/` at the root)

## Conventions for every task

- Read the relevant guide in `node_modules/next/dist/docs/01-app/` before writing Next.js code (CLAUDE.md). Caching: `02-guides/caching-without-cache-components.md`, `03-api-reference/04-functions/{unstable_cache,revalidateTag,revalidatePath}.md`.
- Copy (labels, messages, toasts) goes in `settingsCopy` in `src/content/admin.ts`, never inline (Constitution IX).
- No raw design values; use tokens (Constitution VII). No new npm dependencies (Constitution II).
- DB-backed Vitest suites use `describeWithDb()` (`src/test/db.ts`) and `seedTestAdmin`/`seedTestContentManager` (`src/test/admin-session.ts`); set generous hook timeouts like `access-matrix.test.ts` does.
- E2E specs must be named `e2e/admin-settings-*.spec.ts` so the serial `admin` Playwright project picks them up. Never run `npm run build` and Playwright at the same time.

---

## Phase 1: Setup (shared infrastructure)

**Purpose**: copy, shared lifts and static assets that everything else imports.

- [X] T001 [P] Add `settingsCopy` to `src/content/admin.ts`: `nav` labels per group (`contact: "Contact & social"`, `hero: "Hero slides"`, `stats: "Stats"`, `video: "Home video"`, `gallery: "Photo gallery"`); field labels and hints for every field in data-model.md; `save: "Save"`, `saving: "Saving…"`; toasts `saved: (group) => \`${group} saved\``, `conflict: "This group was changed by someone else. Reload to see their changes."`, `unavailable: "Couldn't save right now. Please try again."`, `invalid: "Check the highlighted fields."`; messages `imageLimits: "Images must be JPG, PNG or WebP, up to 5 MB."`, `lastVisibleSlide: "At least one visible slide is required"`, `buttonPair: "Add a button label and a link together, or neither"`, `youtube: "Enter a YouTube video address"`, `wholeNumber: "Only whole numbers from 0 to 100,000,000 are accepted"`, `displaySeconds: "Enter a whole number of seconds from 3 to 15"`, `required: "This field is required"`, `url: "Enter a full web address starting with https://"`, `urlOrPath: "Enter a site path starting with / or a full web address"`, `email: "Enter a valid email address."`; list UI (`addSlide`, `addImages`, `moveUp`, `moveDown`, `dragHandle`, `edit`, `hide`, `show`, `hidden`, `done`, `cancel`, `unsavedPrompt`, `lastSaved: (by, at) => …`, `tooMany: (max) => …`, `uploadFailed`); delete-dialog copy objects `deleteSlide` and `deleteImage` (title, body "It will be removed when you save.", cancel, confirm). Add `/admin/settings/*` titles to `adminExtraPageTitles`.
- [X] T002 [P] Lift the upload helpers out of `src/components/admin/news/cover-image-field.tsx` (plan Reuse Map "Upload"): create `src/lib/uploads/image-limits.ts` (`IMAGE_ALLOWED_TYPES = ["image/jpeg","image/png","image/webp"]`, `IMAGE_MAX_BYTES = 5*1024*1024`, `async precheckImage(file): Promise<"bad_format" | "too_large" | null>`, which checks the declared type, the size, **and the file's first bytes** for a JPEG (`FF D8 FF`), PNG (`89 50 4E 47`) or WebP (`RIFF….WEBP`) signature, so a renamed PDF is refused) and `src/lib/uploads/direct-upload.ts` (`SignedUpload` type, `requestSignature(endpoint: string, kind: string)`, `uploadToCloudinary(file, signed)` returning `{ secure_url, public_id, width, height }`). Make `CoverImageField` import them with `endpoint="/api/admin/uploads/sign"`, `kind="news-cover"`; its behaviour and copy stay identical. Add `src/lib/uploads/image-limits.test.ts` (JPG/PNG/WebP accepted; GIF, SVG, HEIC, video and 5 MB + 1 byte refused; PDF bytes named `photo.jpg` with type `image/jpeg` refused). Run `src/components/admin/news/*.test.tsx` and the 003 news image E2E (`e2e/admin-news-images.spec.ts`) to confirm no regression.
- [X] T003 [P] Generalise `src/lib/cloudinary.ts` (research R7): add `SETTINGS_HERO_FOLDER = "settings/hero"`, `SETTINGS_GALLERY_FOLDER = "settings/gallery"`, `signImageUpload(folder)` and `verifyUploadedImage(publicId, folder)` with the existing news logic parameterised by folder (same formats, 5 MB, transformation, `NEWS_COVER_VERIFY=skip` outside production). Re-implement `signNewsCoverUpload()` / `verifyNewsCover()` as one-line wrappers. Add `deleteUploadedImage(publicId)` (best effort, swallows errors). Extend `src/lib/cloudinary.test.ts` with folder cases (wrong folder refused, each settings folder accepted).
- [X] T004 [P] Split the delete dialog (plan Reuse Map "Dialog"): in `src/components/admin/admin-delete-dialog.tsx` export a new `AdminConfirmDeleteDialog({ itemName, copy: { trigger, title, body, cancel, confirm }, onConfirm, triggerLabel? })` holding the existing `AlertDialog` markup, and re-implement `AdminDeleteDialog` on top of it (its fetch/toast/redirect logic unchanged). Existing callers (news, signups, messages) must not change. Add `src/components/admin/admin-delete-dialog.test.tsx`: confirm calls `onConfirm` once; cancel does not.
- [X] T005 [P] Add the branded placeholder slide images `public/images/hero/placeholder-desktop.svg` (1920×700 viewBox) and `public/images/hero/placeholder-mobile.svg` (750×900): brand background token colours and the school logo from `public/images/logo.svg`, no text other than the school name (clarification 1). Kebab-case names (architecture.md).
- [X] T006 [P] Add `"settings_saved"` and `"settings_read_failed"` to `SecurityEventType` in `src/lib/log.ts`, and an optional `group?: string` field to `SecurityEvent` (document it: group key only, never values).

**Checkpoint**: shared pieces lifted, news still green.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the definition engine, storage, save path, readers and the generic admin shell every story uses. ⚠️ No story work starts until this phase is done.

### Tests first

- [X] T007 [P] Write `src/lib/settings/schema.test.ts` against a small **test-only** definition (not the real groups), covering every field type per contracts/field-definitions.md: text trim + `maxLength`, `format: "email"`, longText keeps line breaks, number integer/min/max (refuses `-1`, `2.5`, `"abc"`, empty), url (`https://` ok; `http://` ok; `javascript:`, `data:`, `ftp:` refused; path `/x` only with `allowPath`), image (`publicId` must start with the field's folder; empty `publicId` accepted only for the two placeholder paths), video (see T010), boolean, list (`maxItems`, item `id` must be a UUID, `allOrNone`, `atLeastOneVisible` on live items only). Error paths are dotted (`slides.1.buttonLink`). Include SC-009: add a field to a copy of the test definition and assert `schemaFor` now enforces it and `defaultsFor` includes it.
- [X] T008 [P] Write `src/lib/settings/items.test.ts`: `liveItems` filters `deletedAt`; `moveItem(list, from, to)` for up/down/first/last/no-op; `reconcileItems(stored, incoming, now)` marks absent live items deleted, keeps previously deleted items after the live ones, refuses an incoming id matching a stored deleted item, refuses duplicate ids, and caps retained deleted items at 500 (oldest dropped).
- [X] T009 [P] Write `src/lib/settings/mutations.test.ts` (`describeWithDb`, clears `settings` before each): first save inserts version 1 with `updatedBy`; save with the right version → version 2; stale version → `conflict`, document unchanged; two concurrent saves with the same expected version → exactly one succeeds (`Promise.all`); first-save race (two inserts at version 0) → one `conflict`; invalid data → `invalid`, nothing written; image verify failure → `image_rejected`, nothing written, `deleteUploadedImage` called (mock `@/lib/cloudinary`); only images new since the stored version are verified.
- [X] T010 [P] Write `src/lib/settings/youtube.test.ts`: accepted `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, `youtube.com/watch?v=dQw4w9WgXcQ&t=10`, `https://m.youtube.com/watch?v=…`, `https://youtu.be/dQw4w9WgXcQ`, `youtu.be/dQw4w9WgXcQ?si=x`, `https://www.youtube.com/embed/dQw4w9WgXcQ`, `https://youtube.com/shorts/dQw4w9WgXcQ`; refused `https://vimeo.com/1`, `https://www.youtube.com/@DASMetroville`, `https://www.youtube.com/playlist?list=PL…`, `https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ`, `watch?v=short`, `javascript:alert(1)`, empty (returns null; emptiness is handled by the field's `required`).
- [X] T011 [P] Write `src/lib/settings/public.test.ts`: returns the public shape only (no `deletedAt`, `version`, `updatedBy`, hidden slides); on a thrown or timed-out (>3 s, fake timers) read returns the last good value, else `defaultsFor`; never throws; logs `settings_read_failed` without values. Mock `unstable_cache` to call through. Add: a failed read is not cached (a second call after the database recovers returns real values, not defaults).

### Implementation

- [X] T012 Create `src/lib/settings/types.ts` exactly per contracts/field-definitions.md (`Field`, `ListRule`, `GroupDefinition`, `GroupKey = "contact" | "hero" | "stats" | "video" | "gallery"`, `ImageRef`, list item envelope `{ id: string; deletedAt: Date | null }`). No server imports (client-safe).
- [X] T013 [P] Create `src/lib/settings/youtube.ts`: `parseYouTubeAddress(text): { id: string } | null` per data-model.md "video" (hosts exactly `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`; id `[A-Za-z0-9_-]{11}`; scheme optional). Make T010 pass.
- [X] T014 [P] Create `src/lib/settings/items.ts` (`liveItems`, `moveItem`, `reconcileItems`, `MAX_DELETED_RETAINED = 500`). Make T008 pass.
- [X] T015 Create `src/lib/settings/schema.ts` (`schemaFor(def)`, dotted-path field errors via `src/lib/validation/field-errors.ts`) and `src/lib/settings/defaults.ts` (`defaultsFor(def)`: field default, `""` for optional text/url/video, list defaults from the definition). Messages come from `settingsCopy`. The placeholder image paths are constants exported from `defaults.ts`. Make T007 pass. Depends on T012, T013.
- [X] T016 Create the five definitions in `src/lib/settings/groups/{contact,hero,stats,video,gallery}.ts` with the fields, limits and defaults in data-model.md, and `src/lib/settings/registry.ts` (`GROUPS`, `GROUP_KEYS`, `getDefinition(key)` → refuses unknown keys). `contact` defaults are **imported from `contactInfo`** in `src/content/site-shell.ts` (not copied); `hero` default is one visible slide using the placeholder SVGs with alt "Dar-e-Arqam Schools"; `stats` defaults 300000/50/14500/700; `video` default `""`; `gallery` default `[]`. Add `src/lib/settings/defaults.test.ts`: `defaultsFor(contactDefinition)` deep-equals `contactInfo` (SC-001), hero default passes its own schema, every group's default passes its own schema. Depends on T015.
- [X] T017 [P] Create `src/models/settings.ts`: collection `settings`, `_id: String` (group key), `data: Schema.Types.Mixed`, `version: Number`, `updatedBy: String`, `timestamps: { createdAt: false, updatedAt: true }`. No soft-delete plugin (items carry their own `deletedAt`, research R3). Comment why Zod, not Mongoose, validates `data`.
- [X] T018 Create `src/lib/settings/mutations.ts`: `saveGroup({ group, expectedVersion, data, actorEmail })` doing validate → `reconcileItems` → verify new images via `verifyUploadedImage` (folder from the field definition) → compare-and-set write (research R2: `insertOne` at version 0 catching duplicate-key as conflict; `findOneAndUpdate({ _id, version })` otherwise) → return `{ ok: true, version, data: live view, savedAt } | { ok: false, error, fields? }`. Returns `unavailable` on a database error. Make T009 pass. Depends on T014, T016, T017, T003.
- [X] T019 [P] Create `src/lib/settings/admin.ts`: `getAdminSettings(group)` → `{ data (live items only), version, updatedAt, updatedBy }`, defaults with `version: 0` when there is no document. Depends on T016, T017.
- [X] T020 Create `src/lib/settings/public.ts` per research R5 and contracts/settings-actions.md: `getPublicSettings(group)`: a cached reader `unstable_cache(read, ["settings", group], { revalidate: 60, tags: ["settings", \`settings:${group}\`] })` that **throws** on failure (so a failed read is never cached), called inside a 3 s timeout and a `try/catch` outside the cache, a module-level last-good map, fallback to `defaultsFor`, `logSecurityEvent({ type: "settings_read_failed", group })`; maps each group to its public shape (data-model.md "Derived / public shapes": hero = live **and** visible slides; social entries with `""` omitted). Export `SETTINGS_TAG(group)`. Make T011 pass. Depends on T016, T017, T006.
- [X] T021 Create the Server Action `src/app/admin/(dashboard)/settings/actions.ts` (`"use server"`): `saveSettingsGroup({ group, expectedVersion, data })` per contracts/settings-actions.md: `requireAdminAccess("settings")` first; unknown group → `invalid`; call `saveGroup` with `access.session.email`; on success `revalidateTag("settings", { expire: 0 })`, `revalidateTag(\`settings:${group}\`, { expire: 0 })` and `revalidatePath("/", "layout")` (research R5; `updateTag` is not used because the docs cover it only for `cacheTag`/`fetch` tags), `logSecurityEvent({ type: "settings_saved", email, group })`; never read an actor from the input. Depends on T018, T020.
- [X] T022 Create the generic admin UI in `src/components/admin/settings/` (all `"use client"` except the nav):
  - `settings-nav.tsx`: links to the five group URLs with `aria-current`, wrapping or stacking on narrow widths with no horizontal page scroll;
  - `field-control.tsx`: maps a `Field` to a control inside `FormField`/`FormLabel`/`FormControl`/`FormMessage` from `src/components/ui/form.tsx` (text/url/video → `Input` with a counter when `maxLength ≤ 200`; longText → multi-line field with a counter; number → `Input inputMode="numeric"`; boolean → switch; image → `ImageField` (T023); list → `ListEditor` (T024));
  - `settings-group-form.tsx`: `<SettingsGroupForm definition value version updatedAt updatedBy />` holding the form state; dirty = deep-compare with the last loaded or saved value; `useUnsavedChanges(isDirty, settingsCopy.unsavedPrompt)`; client-side `schemaFor(definition)` before calling `saveSettingsGroup`; maps results to toasts and path-keyed field errors; on `conflict` keeps the edits; on `success` replaces value and version from the response; shows `settingsCopy.lastSaved`.
  Depends on T015, T021.
- [X] T023 [P] Create `src/components/admin/settings/image-field.tsx`: the `CoverImageField` flow via `src/lib/uploads/*` (T002) against `/api/admin/settings/uploads/sign` with the field's `kind`; `precheckImage` shows `settingsCopy.imageLimits` before any upload; the preview uses `next/image` + `cloudinaryLoader`, or a plain image for the placeholder paths; remove button; a failed upload only sets this field's local error and never touches parent state (FR-028). Depends on T002.
- [X] T024 Create `src/components/admin/settings/list-editor.tsx` and `slide-panel.tsx` (plan Reuse Map "Table" and "Right panel"):
  - rows use `src/components/ui/table.tsx` at ≥ md and stacked cards below md (the 011 `users-table.tsx`/`user-card.tsx` split), or cards at every width when the list definition says `layout: "cards"`;
  - up/down buttons (disabled at the ends, `aria-live` announcement of the new position), plus a drag handle using native HTML5 drag events; both call `moveItem`;
  - "Add" and "Edit" open `slide-panel.tsx`, a `Sheet` from `src/components/ui/sheet.tsx` (full width on phones) whose fields are generated from `itemFields` through `field-control.tsx`. It closes on Escape, outside click, the close button or Cancel, warning first when changed (copy the `UserPanel` close logic from `src/components/admin/users/user-panel.tsx`; if it is inline there, extract `useSheetDirtyGuard` into `src/components/admin/use-sheet-dirty-guard.ts` and use it in both, with no behaviour change to `UserPanel`). "Done" validates the item with the item schema and writes it into the group form state only;
  - delete uses `AdminConfirmDeleteDialog` (T004) and removes the item from form state;
  - a `visible` boolean item field renders as a Hide/Show toggle in the row;
  - `atLeastOneVisible`: disable Hide and Delete on the last visible live item, with `settingsCopy.lastVisibleSlide` as the reason.
  Depends on T004, T022.
- [X] T025 Create `src/app/admin/(dashboard)/settings/layout.tsx` (renders `SettingsNav` and children; **not** an access gate, add a comment saying so). Create five static group pages rather than one dynamic `[group]` route, so the access inventory lists each file: `src/app/admin/(dashboard)/settings/{contact,hero,stats,video,gallery}/page.tsx`. Each one: `export const dynamic = "force-dynamic"`, `await requireAdminPage("settings")`, `getAdminSettings(<group>)`, renders `<SettingsGroupForm definition={GROUPS.<group>} … />`, with metadata title from `settingsCopy`. Replace `src/app/admin/(dashboard)/settings/page.tsx` so it calls `requireAdminPage("settings")` **then** `redirect("/admin/settings/contact")`. Depends on T019, T022.
- [X] T026 Create the upload signer `src/app/api/admin/settings/uploads/sign/route.ts`: `requireAdminAccess("settings")` → `accessErrorResponse`; body `{ kind }` with `hero-desktop`/`hero-mobile` → `SETTINGS_HERO_FOLDER` and `gallery` → `SETTINGS_GALLERY_FOLDER`, otherwise `validationResponse({ kind: "Unknown upload kind." })`; returns `signImageUpload(folder)` with `NO_STORE`. Add `route.test.ts` next to it (unknown kind → 400; each kind → the right folder; the secret is never in the body). Depends on T003.

**Checkpoint**: `npm test -- src/lib/settings src/lib/uploads src/lib/cloudinary.test.ts` passes. Any settings group page renders and saves for a main admin.

---

## Phase 3: User Story 1 — Settings is permission-gated (P1) 🎯 MVP gate

**Goal**: only a main admin, or a content manager granted `settings`, can use any Settings page, route or action (FR-001–FR-003).

**Independent test**: as a content manager without `settings`, every Settings page redirects to `/admin?denied=1` and the route and action are refused; signed out, login redirect / 401; with the permission, all work.

### Tests

- [X] T027 [P] [US1] Add to `EXPECTED` in `src/test/access-inventory.test.ts`: the six settings pages (`admin/(dashboard)/settings/page.tsx` plus the five group pages) as `{ kind: "page", access: "settings" }`, `api/admin/settings/uploads/sign/route.ts` as `{ kind: "route", access: "settings" }`, and `admin/(dashboard)/settings/actions.ts` as `{ kind: "action", access: "settings" }`. Check that `settings/layout.tsx` does not trip the page walker; if it does, list it as `{ kind: "none" }` with a comment (Next guide "Layouts and auth checks").
- [X] T028 [P] [US1] Add `POST /api/admin/settings/uploads/sign` (access `settings`, body `{ kind: "gallery" }`) to the `routes` table in `src/app/api/admin/access-matrix.test.ts`.
- [X] T029 [P] [US1] Write `src/app/admin/(dashboard)/settings/actions.test.ts` (`describeWithDb`, `mockNextHeaders`, real sessions): for each of the five groups, (1) no session → `{ status: "error", error: "unauthorized" }` and no document written; (2) content manager with every permission except `settings` → `forbidden`, nothing written, `access_denied` logged; (3) content manager with `settings`, and main admin → proceeds (a valid default payload saves and returns `success`). Add: a crafted `updatedBy`/`email` in the input is ignored (the stored `updatedBy` is the session email); unknown group → `invalid`; content manager whose `settings` grant is removed between load and save → `forbidden` (US1 scenario 4).
- [ ] T030 [P] [US1] Add the five group paths (`/admin/settings/contact`, `/hero`, `/stats`, `/video`, `/gallery`, access `settings`) to `pages` in `e2e/admin-roles-access-matrix.spec.ts` (`/admin/settings` is already listed).
- [X] T031 [P] [US1] Write `e2e/admin-settings-access.spec.ts`: a content manager with `news` only does not see Settings in the sidebar, and opening `/admin/settings/hero` by URL shows "You don't have access to that section." on the overview; a content manager with `settings` sees all five group links and can save Stats.

### Implementation

- [X] T032 [US1] Confirm the sidebar entry in `src/components/admin/app-sidebar.tsx` / `adminNavItems` points to `/admin/settings`, is filtered by `canAccess(…, "settings")`, and is marked active for every `/admin/settings/*` path (update `src/lib/admin-nav-active.ts` and its test if prefix matching doesn't already cover sub-paths). Run T027–T031 until green.

**Checkpoint**: Constitution XI holds for every Settings entry point.

---

## Phase 4: User Story 2 — Contact & social details (P1)

**Goal**: the admin edits contact and social details; the header, footer and Contact page read them; the site is unchanged on release (FR-008–FR-011).

**Independent test**: with an empty `settings` collection the site matches the pre-005 values. After changing the phone and clearing TikTok, the new phone shows on `/contact` and the TikTok icon disappears from the top bar and footer.

### Tests

- [X] T033 [P] [US2] Update `src/lib/contact-details.test.ts`: `getContactDetails()` returns `contactInfo` when nothing is saved (mock `getPublicSettings` / use `describeWithDb` with an empty collection), returns the saved values after a save, and omits empty social entries.
- [X] T034 [P] [US2] Update `src/components/site-shell/footer.test.tsx` and `top-bar.test.tsx`: `Footer` now takes a `contact: ContactInfo` prop, and both render only the platforms present (an empty TikTok shows no TikTok link; the order stays Facebook, YouTube, Instagram, TikTok as in `social-links.tsx`).
- [X] T035 [P] [US2] Write `e2e/admin-settings-contact.spec.ts` (clears `settings` via `e2e/helpers/settings.ts`, T037):
  1. empty collection → `/` top bar and footer social hrefs and `/contact` phone, email, address, office hours and "Open in Google Maps" href equal `contactInfo` (SC-001);
  2. as main admin, change phone, email, address, office timings and map location, clear TikTok, Save → success toast; `/contact` shows the new values; the footer and top bar have no TikTok link (US2 scenarios 2–3; brief "edit contact details and see them in the header and footer");
  3. `not-an-email`, an empty phone and `ftp://x` map location → a field error under each, nothing saved, other typed values still in the inputs (scenario 4);
  4. the Contact page after an edit still has the same headings and four columns (scenario 5).

### Implementation

- [X] T036 [US2] Switch `getContactDetails()` in `src/lib/contact-details.ts` to `return getPublicSettings("contact")` (the 008 seam; keep the signature `Promise<ContactInfo>`, `mapEmbedSrc` and `CONTACT_PLACEHOLDER_FIELDS` unchanged; update the doc comment).
- [X] T037 [P] [US2] Create `e2e/helpers/settings.ts` on the `withConnection` pattern of `e2e/helpers/news.ts`: `clearSettings()`, `seedSettingsGroup(group, data, version = 1)`, `readSettingsGroup(group)` (includes deleted items, for soft-delete assertions), and `stubCloudinaryUpload(page, { width, height })`, which routes `https://api.cloudinary.com/v1_1/*/image/upload` to a fake `{ secure_url, public_id: "<folder>/e2e-<n>", width, height }` using the folder from the posted form (runs with `NEWS_COVER_VERIFY=skip`, like 003).
- [X] T038 [US2] Make `src/components/site-shell/public-shell.tsx` an async Server Component that calls `getContactDetails()` once and passes `contact` to `Header` (edit `src/components/site-shell/header.tsx` to accept `contact` and pass it to `TopBar`) and to `Footer` (edit `src/components/site-shell/footer.tsx` to take `contact: ContactInfo` and stop importing `contactInfo`). Keep the `TopBar` default prop for its existing unit tests.
- [X] T039 [US2] Add `export const revalidate = 60` to `src/app/(public)/layout.tsx` (research R5), with a comment linking FR-030/FR-032. Check that `/news` pages (`force-dynamic`) still build and that `/contact` still renders. The Contact page (`src/app/(public)/contact/page.tsx`) already calls `getContactDetails()`, so do not change its markup.

**Checkpoint**: US2 E2E green; `e2e/contact-*.spec.ts`, `footer.spec.ts` and `contact-and-social.spec.ts` still pass (except the known stale 001–003 failures listed in memory/branch notes).

---

## Phase 5: User Story 3 — Hero slides (P1)

**Goal**: add, edit, reorder, hide and delete slides; display time; at least one visible slide always (FR-012–FR-017).

**Independent test**: add two slides, move the second up, hide one, save, reload: order and visibility persist. Hiding or deleting the last visible slide is impossible in the UI and refused by the server.

### Tests

- [X] T040 [P] [US3] Add hero cases to `src/lib/settings/schema.test.ts` using the real `heroDefinition`: missing desktop image or alt → error on that path; button label without link (and vice versa) → `buttonPair`; `buttonLink` `/admissions` and `https://x.pk` ok, `javascript:alert(1)` refused; heading of 81 chars refused; `displaySeconds` 2, 16 and 4.5 refused, 3 and 15 ok; 11 live slides refused; **zero visible live slides refused** (including one hidden plus one deleted in the same payload, SC-006).
- [X] T041 [P] [US3] Add to `src/lib/settings/mutations.test.ts`: a crafted hero payload with every slide hidden → `invalid` with `fields.slides = lastVisibleSlide` and the stored document unchanged; deleting a slide stores it with `deletedAt` and `getAdminSettings` no longer returns it; re-sending a deleted slide's id → `invalid`.
- [ ] T042 [P] [US3] Write `e2e/admin-settings-hero.spec.ts` (`stubCloudinaryUpload`):
  1. the page shows the one placeholder slide; its Hide and Delete are disabled with the "At least one visible slide is required" reason (US3 scenario 6);
  2. Add slide → the panel slides in from the right with desktop image, mobile image, alt, heading, button label, button link and visible; saving the panel without alt shows a field error (scenarios 1–2); a label without a link shows the pair error (scenario 3);
  3. add two slides, move the second up with the up button, hide one, Save, reload → the order and hidden state persist (brief acceptance "add two slides, reorder them, hide one"); up is disabled on the first row and down on the last (scenario 4);
  4. delete a slide → confirm dialog → Save → it is gone from the list, and `readSettingsGroup("hero")` still holds it with `deletedAt` (scenario 7);
  5. display time 2 → error; 8 → saved (scenario 8);
  6. a crafted `saveSettingsGroup` call with every slide hidden (evaluate via a page form post) → refused with the same message (FR-015, "tests prove the last visible hero slide cannot be removed");
  7. at 375px the panel is full width and the list shows as cards.

### Implementation

- [X] T043 [US3] Wire the hero definition's list options in `src/lib/settings/groups/hero.ts`: `itemLabel: "slide"`, `layout: "table"`, summary columns (thumbnail from `desktop`, `heading || alt`, visible badge), `maxItems: 10`, rules `atLeastOneVisible("visible")` and `allOrNone(["buttonLabel","buttonLink"])`. Add the `layout` and `summary` options to `Field`'s list variant in `src/lib/settings/types.ts` and render them in `list-editor.tsx` (the generic editor stays generic; no hero-specific component).
- [X] T044 [US3] In `image-field.tsx`, pass the field's `kind` (`hero-desktop` / `hero-mobile`) from the definition. Make the mobile image optional with a "Remove" button. Show the placeholder SVG preview for the default slide.
- [X] T045 [US3] Export `getPublicSettings("hero")`'s return type as `PublicHero` from `src/lib/settings/public.ts` (`{ displaySeconds, slides: { id, desktop, mobile?, alt, heading?, button?: { label, href } }[] }`) and document in a comment that 006 renders it (mobile image below the reference's mobile breakpoint, no auto-advance under `prefers-reduced-motion`, FR-017). Add a public-shape test case to `public.test.ts`: hidden and deleted slides excluded, order kept.

**Checkpoint**: US3 E2E green; last-visible rule proven in unit, DB and E2E tests.

---

## Phase 6: User Story 4 — Stats (P1)

**Goal**: edit the four numbers; only whole numbers from 0 to 100,000,000 (FR-018).

**Independent test**: change students to 310000 → saved; -5, 2.5, "abc", empty and 100000001 are each refused.

- [X] T046 [P] [US4] Add stats cases to `src/lib/settings/schema.test.ts` with the real `statsDefinition` (every boundary above; `"310000"` from a form input coerces to 310000; `" 42 "` is trimmed).
- [X] T047 [P] [US4] Write the Stats half of `e2e/admin-settings-stats-video.spec.ts`: update all four numbers → success toast → reload shows them (brief acceptance "update stats"); each invalid value shows `wholeNumber` under its field, and nothing in the group is saved (the other three fields keep their stored values after a reload).
- [X] T048 [US4] Make sure `field-control.tsx`'s number control sends a number (not a string) and that `schemaFor` coerces a numeric string from the input, refusing anything with a decimal point, sign or exponent (`1e3`). Check that `groups/stats.ts` labels read "Students", "Books", "Teachers", "Campuses".

---

## Phase 7: User Story 5 — Home video (P2)

**Goal**: set or clear one YouTube address (FR-019, FR-020).

**Independent test**: a watch address saves; a Vimeo address is refused; clearing stores `""`.

- [X] T049 [P] [US5] Write the Video half of `e2e/admin-settings-stats-video.spec.ts`: save `https://www.youtube.com/watch?v=dQw4w9WgXcQ` → reload shows it; `https://vimeo.com/1` → "Enter a YouTube video address" and the previous value is kept after a reload; clear + Save → `readSettingsGroup("video").data.youtubeUrl === ""` (brief acceptance "set and clear the video URL").
- [X] T050 [US5] In `src/lib/settings/public.ts`, give `PublicVideo` a derived `youtubeId: string | null` (via `parseYouTubeAddress`, never stored) so 006 can embed without re-parsing, plus a `public.test.ts` case: empty → `youtubeId: null`. Label the field "Home video (YouTube address)" with the hint "Leave empty to hide the video." in `settingsCopy`.

---

## Phase 8: User Story 6 — Photo gallery (P2)

**Goal**: upload several images at once, caption, reorder and delete (FR-021–FR-023).

**Independent test**: upload three, caption one, move the third to first, delete the second, save, reload: two images in the new order with the caption.

### Tests

- [X] T051 [P] [US6] Add gallery cases to `schema.test.ts` / `mutations.test.ts`: a 151-character caption is refused; 201 live images are refused; a `settings/hero/…` publicId in the gallery is refused (wrong folder); a delete stores `deletedAt`.
- [ ] T052 [P] [US6] Write `e2e/admin-settings-gallery.spec.ts` (`stubCloudinaryUpload`): select 3 valid files in one picker action → three items with per-file progress, then listed in chosen order; caption one; move the third to first with the up button; delete the second (confirm); Save; reload → two images in the new order with the caption, and `readSettingsGroup` holds the deleted one with `deletedAt` (brief acceptance "upload, reorder and delete gallery images").
- [ ] T053 [P] [US6] Write `e2e/admin-settings-uploads.spec.ts` (brief acceptance "oversized or wrong-type uploads are rejected"; fixtures in `e2e/fixtures/`: a 5 MB + 1 byte JPEG, a GIF, a PDF renamed `photo.jpg`, a valid PNG):
  1. gallery: select all four → the PNG is added; the other three are each listed with "Images must be JPG, PNG or WebP, up to 5 MB."; unsaved caption edits elsewhere in the form survive;
  2. hero desktop image: the oversized file → the same message, and the panel's other typed fields survive (FR-028);
  3. the server-side refusal (a file that got past the browser check) is proven in T054, because the E2E server runs with `NEWS_COVER_VERIFY=skip`; this spec covers the browser path only.
- [X] T054 [P] [US6] Add to `src/lib/settings/mutations.test.ts` (mocked `verifyUploadedImage`): `too_large`, `bad_format` and `wrong_folder` each → `image_rejected` with `settingsCopy.imageLimits` on the right path, nothing stored, `deleteUploadedImage` called; `unavailable` → `unavailable`.

### Implementation

- [X] T055 [US6] Create `src/components/admin/settings/gallery-uploader.tsx`: `<input type="file" multiple accept="image/jpeg,image/png,image/webp">`; at most 20 files per selection (any extra listed with `tooMany(20)`); `precheckImage` per file; valid files upload through `requestSignature("/api/admin/settings/uploads/sign","gallery")` + `uploadToCloudinary`, 3 at a time, each with its own progress row; successes are appended to the list in selection order; failures are listed with their reason and a dismiss button; never resets other form state. Render it from `list-editor.tsx` when the list definition says `addMode: "upload"` (add `addMode` to the list `Field` type), so the gallery still goes through the generic editor.
- [X] T056 [US6] Configure `src/lib/settings/groups/gallery.ts`: `layout: "cards"`, `addMode: "upload"`, `maxItems: 200`, the caption edited inline on the card (list option `inlineFields: ["caption"]`, no panel), the image kind `gallery`. Implement `inlineFields` in `list-editor.tsx`.

---

## Phase 9: User Story 7 — Saving, publishing and unsaved changes (P2)

**Goal**: independent atomic saves, conflict refusal, live within a minute, unsaved-changes warning, and a site that survives unreadable settings (FR-027–FR-032, FR-034).

**Independent test**: see quickstart §7.

- [X] T057 [P] [US7] Write `e2e/admin-settings-saving.spec.ts`:
  1. **conflict**: open Stats in two browser contexts (main admin + content manager with `settings`); save in A; change a value in B and Save → the conflict toast, B's typed value still in the input, the stored value is A's (US7 scenario 5, clarification 2);
  2. **independence**: save Stats; Contact's `version` is unchanged (scenario 1);
  3. **unsaved changes**: edit Contact and click the "Hero slides" nav link → a `dialog` event with `settingsCopy.unsavedPrompt`; dismiss → still on Contact with the edit; save, then switch → no dialog (scenario 3);
  4. **server error keeps edits**: route the Server Action POST to a 500 → error toast, edits kept (scenario 2);
  5. **live within a minute**: after saving Contact, a fresh public request to `/contact` shows the new phone (the tag-revalidation path; SC-003).
- [ ] T058 [P] [US7] Add a fallback test to `src/lib/settings/public.test.ts` and a render test `src/components/site-shell/public-shell.test.tsx`: when `getPublicSettings` rejects internally (mock the model to throw), `PublicShell` still renders the header and footer with `contactInfo` values (FR-032, SC-008).
- [X] T059 [US7] Show the "Last saved by {email} on {PKT date-time}" line (via `src/lib/admin-datetime.ts`) under each group form's Save button, and "Not saved yet — showing starting values" when `version === 0`. Make sure the Save button is disabled while saving and while nothing is dirty.

---

## Phase 10: Polish & cross-cutting

- [ ] T060 [P] Write `e2e/admin-settings-layout.spec.ts`: each of the five group pages and the slide panel at 375, 768, 1024 and 1440px have no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`) and no overlapping controls (bounding-box checks on the Save button and nav), per FR-035 / SC and Constitution XI.
- [ ] T061 [P] Accessibility pass: every generated control has a label; list up/down buttons have names including the item ("Move slide 2 up"); position changes are announced; the drag handle is `aria-hidden` (buttons are the accessible path); the panel traps focus and returns it to the triggering row. Add assertions to `e2e/admin-settings-hero.spec.ts`.
- [X] T062 [P] Update `docs/architecture.md`: a "Settings (005) data rules" section (one document per group with `_id` = key; version compare-and-set; list-item soft delete; public reads via `getPublicSettings` with `unstable_cache` 60 s + tags + `revalidateTag`/`revalidatePath` on save + fallback; `(public)/layout.tsx` `revalidate = 60`; `cacheComponents` deliberately off); add `src/lib/settings/`, `src/lib/uploads/`, `src/components/admin/settings/` and `AdminConfirmDeleteDialog` to "Folder layout"; add `/api/admin/settings/uploads/sign` to "API namespaces"; update the `src/lib/contact-details.ts` line.
- [X] T063 [P] Add the 005 rows to `specs/011-roles-and-users/contracts/access-matrix.md` (pointing to `specs/005-settings/contracts/access-matrix.md`) so the source-of-truth table stays complete.
- [ ] T064 Run the full suites in sequence (never in parallel with a build): `npm test`, then `npx playwright test --project=admin`, then `--project=chromium`, then `--project=forms`. Compare admin failures against the known pre-existing baseline (memory: ~35 stale admin failures) and fix only new ones. Then `npm run build` on its own. Record results in `specs/005-settings/quickstart.md` under "Last verified".
- [ ] T065 Walk through `specs/005-settings/quickstart.md` §1–§7 by hand against a dev server and tick each item; note in the spec's Assumptions that the contact placeholders (phone, address, map, hours) must be replaced by the client through Settings after release.

---

## Dependencies & execution order

### Phases

- **Setup (T001–T006)**: no dependencies; all [P].
- **Foundational (T007–T026)**: after Setup. Blocks every story.
  - Tests T007–T011 [P] first.
  - T012 → T013/T014 [P] → T015 → T016 → (T017 [P] can start with T012) → T018 → T019 [P], T020 → T021 → T022 → T023 [P] → T024 → T025; T026 needs only T003.
- **US1 (T027–T032)**: after Foundational. Do it first: it is the gate for Constitution XI.
- **US2 (T033–T039)**, **US3 (T040–T045)**, **US4 (T046–T048)**: after Foundational; independent of each other (US2 touches the site shell, US3 the list editor and hero definition, US4 only number handling).
- **US5 (T049–T050)**, **US6 (T051–T056)**: after Foundational; US6 reuses `list-editor.tsx`, so if US3 is in progress in parallel, coordinate edits to that file (T043 before T055/T056).
- **US7 (T057–T059)**: after Foundational; T057 scenario 5 needs T036 (US2).
- **Polish (T060–T065)**: after the stories you intend to ship.

### Story independence

| Story | Needs beyond Foundational | Blocks |
|---|---|---|
| US1 | — | none (but ship it with anything) |
| US2 | T037 helper (inside US2) | US7 scenario 5 |
| US3 | T037 helper | — (shares `list-editor.tsx` with US6) |
| US4 | — | — |
| US5 | — | — |
| US6 | T037 helper | — |
| US7 | T036 for one scenario | — |

## Parallel examples

**Setup**: T001, T002, T003, T004, T005 and T006 together (six different files).

**Foundational tests**: T007, T008, T009, T010 and T011 together; then T013 ∥ T014 ∥ T017 once T012 is done.

**US1**: T027 ∥ T028 ∥ T029 ∥ T030 ∥ T031 (different test files), then T032.

**US2**: T033 ∥ T034 ∥ T035 ∥ T037, then T036 → T038 → T039.

**US3**: T040 ∥ T041 ∥ T042, then T043 → T044 → T045.

**US6**: T051 ∥ T052 ∥ T053 ∥ T054, then T055 → T056.

## Implementation strategy

**MVP (first increment)**: Setup → Foundational → US1 → US2. This ships the permission-gated Settings area with Contact & social live on the header, footer and Contact page, the one part the public site uses in this feature. Stop and check quickstart §1, §2 and §6.

**Increment 2**: US3 (hero) + US4 (stats), the rest of P1 that feature 006 needs.

**Increment 3**: US5 (video), US6 (gallery), US7 (saving hardening), then Polish.

Each increment ends with its E2E specs green and the access matrix still complete.

## Notes

- Commit after each task or logical group on `005-settings`; do not merge or push (branch workflow memory).
- 011 changes are still uncommitted in the working tree; commit them on `011-roles-and-users` before starting, or they will be mixed into 005's commits.
- If any task would need a new dependency, a constitution change or a spec change, stop and ask.

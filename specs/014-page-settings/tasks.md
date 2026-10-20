---
description: "Tasks for 014-page-settings, slice 1 (Settings by page, structure only)"
---

# Tasks: Settings by Page (014, slice 1)

**Input**: `specs/014-page-settings/` — plan.md, spec.md, research.md (R1–R15), data-model.md, contracts/ (panel-actions, access-matrix, tabs-and-panels), quickstart.md; ADR-0013
**Tests**: Required. Constitution XI requires an E2E test per user story and three access cases for every admin entry point; contracts/panel-actions.md lists guarantees that must be proven by tests.
**Organization**: grouped by user story (spec US1–US5) after a shared foundation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from spec.md
- Paths are from the repo root; `settings/` below means `src/app/admin/(dashboard)/settings/`

**Working rules for every task** (from project memory and CLAUDE.md):
- Read the relevant guide in `node_modules/next/dist/docs/` before using any Next API not already used in this repo.
- Never run `npm run build` and Playwright at the same time.
- About 35 admin E2E tests already fail on unchanged code: compare failure **sets** before and after, not totals. Pre-start the dev server before Playwright.
- DB-backed unit tests run through `scripts/with-test-env.sh` (see existing `src/lib/settings/mutations.test.ts` for the pattern and its hook timeouts).

---

## Phase 1: Setup

**Purpose**: Record the baseline before changing anything.

- [X] T001 Record the current failure set: run `npx vitest run` and `npx playwright test e2e/admin-settings-*.spec.ts e2e/admin-gallery-*.spec.ts e2e/admin-roles-access-matrix.spec.ts e2e/admin-home-page.spec.ts e2e/admission-window.spec.ts e2e/admin-registrations.spec.ts` (sequentially, dev server pre-started) and save the list of failing test titles to `specs/014-page-settings/baseline-failures.txt`.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: Access value, panel registry, fingerprint, partial-save mutation, the two save actions, and the panel-aware read. Nothing user-visible changes yet except that the old save action is gone.

**⚠️ No user story starts before this phase is done.**

### Tests first (write, see them fail)

- [X] T002 [P] Add `canAccess` cases for `"settings_or_pages"` (main admin; settings only; pages only; neither; both) to `src/lib/permissions.test.ts`.
- [X] T003 [P] Create `src/lib/settings/panels.test.ts`. It must assert the registry invariants from data-model.md: every top-level field of every `GROUPS` entry is in exactly one panel; every panel is in exactly one tab; each panel's `saveAccess` is admitted by its tab's `access`; panel keys and anchors are unique; the tab order is site-wide, home, about, academics, admission, resources, careers; `visibleTabs` hides tabs with no panels and tabs the user cannot open. It must also assert that `panelDefinition("admission-window")` keeps the `dateOrder` rule and `panelDefinition("admission-messages")` has no rules.
- [X] T004 [P] Create `src/lib/settings/fingerprint.test.ts`: the same value with keys in a different order gives the same fingerprint; any change to a field, list item or item id changes it; the result is 32 lowercase hex characters; only the panel's fields affect it (changing a sibling panel's field leaves it unchanged).
- [X] T005 [P] Add `savePanel` cases to `src/lib/settings/mutations.test.ts`, covering every guarantee in contracts/panel-actions.md:
  - first save of a never-saved group creates version 1;
  - extra keys in `data` outside the panel are never stored;
  - a stale fingerprint gives `conflict` and leaves the stored value unchanged;
  - saving `admission-messages` then `admission-window` with the window's original fingerprint succeeds, and both changes are stored;
  - admin X saves `admission-messages`, then admin Y saves it with the old fingerprint → `conflict`, and X's value stays;
  - two concurrent saves of sibling panels (run with `Promise.all`) both succeed, and the record holds both changes;
  - a forced write miss on 3 attempts → `conflict`;
  - soft-deleted hero slides survive a save of the `hero` panel;
  - a new image that fails verification gives `image_rejected`;
  - `panelSaves.<panel>` holds `{ by, at }` after a save.
- [X] T006 [P] Rewrite `settings/actions.test.ts` for `saveSettingsPanel` and `savePagesPanel`. For each action cover the three access cases: no session → `unauthorized` with nothing stored; a missing permission → `forbidden` with `access_denied` logged; the correct permission → `success`. Then cover:
  - an unknown panel or `photo-gallery` → `invalid`;
  - a fingerprint that is not 32 hex characters → `invalid`;
  - a Pages-only session calling `savePagesPanel` with `panel: "admission-window"` → `forbidden`, logged, dates unchanged;
  - a Settings-only session calling `saveSettingsPanel` with `panel: "admission-messages"` → `forbidden`, logged;
  - a Pages-only `admission-messages` save that also carries `opensOn`, `closesOn` and `classes` stores only the announcement and closed message;
  - a success revalidates the settings tags and logs `settings_saved` with `group` and `panel`;
  - `saveSettingsGroup` is no longer exported.

### Implementation

- [X] T007 [P] Add `"settings_or_pages"` to the `Access` union and to `canAccess` in `src/lib/permissions.ts`. It is granted when the user holds `settings` or `pages`, and always to a main admin. It is NOT added to `PERMISSION_KEYS`. Update the file's doc comment (R2).
- [X] T008 [P] Add optional `panel?: string` to the security event type in `src/lib/log.ts`, documented as "the Settings panel key, for `settings_saved` (014). Never field values".
- [X] T009 [P] Add optional `panelSaves` (`Schema.Types.Mixed`, not required) to `src/models/settings.ts` and to the `SettingsDoc` interface as `Record<string, { by: string; at: Date }> | undefined`. Update the doc comment (data-model.md).
- [X] T010 Add admin copy to `settingsCopy` in `src/content/admin.ts`:
  - `tabs` (labels: Site-wide, Home, About, Academics, Admission, Resources, Careers);
  - `tabsNavLabel: "Settings sections"`;
  - `panels` (title per panel key, from contracts/tabs-and-panels.md);
  - `viewOnSite: "View on site"`;
  - `unsavedBadge: "Unsaved changes"`;
  - `expandPanel`/`collapsePanel` accessible labels;
  - `readOnly.needs(permissionLabel)` → "You need the {label} permission to change this.";
  - `panelUnavailable: "This section couldn't be loaded. Reload to try again."`;
  - make sure `toasts.conflict` reads "Changed by someone else. Reload to see the latest." (keep the existing wording if it already says this).

  Do not touch `adminExtraPageTitles` or `adminNavItems` yet.
- [X] T011 Create `src/lib/settings/panels.ts` (pure, no server imports). Export:
  - `TAB_KEYS`, `TabKey`, `PANEL_KEYS`, `PanelKey`;
  - `SETTINGS_TABS` (key, label, access, panels) and `PANELS` (key, title, anchor, viewOnSite, saveAccess, source), exactly as in the contracts/tabs-and-panels.md tables;
  - `getPanel(key: unknown)` (null for an unknown key);
  - `panelDefinition(panel)`, which returns a `GroupDefinition` with only the panel's fields and only the group rules whose fields are all in the panel;
  - `visibleTabs(user)`, the tabs with ≥ 1 panel that `canAccess(user, tab.access)` allows;
  - `canSavePanel(user, panel)`.

  Make T003 pass.
- [X] T012 Create `src/lib/settings/fingerprint.ts` (`import "server-only"`). Export `panelFingerprint(def, panel, liveValue)`: a canonical JSON with recursively sorted keys of `pick(liveValue, panel fields)`, hashed with `node:crypto` SHA-256, first 32 hex characters. Make T004 pass.
- [X] T013 Add `savePanel({ panel, expectedFingerprint, data, actorEmail })` to `src/lib/settings/mutations.ts`, following research R4 steps 1–6. Reuse the existing `parseGroup`, `reconcileGroupValue`, `toLiveValue`, `mergeWithDefaults`, `collectImages`, `verifyUploadedImage` and `deleteUploadedImage`. Write with `findOneAndUpdate({ _id, version })`, or `create` when version 0 (a duplicate key counts as a miss), and on success `$set` both `data`, `updatedBy` and `"panelSaves.<panel>": { by, at }`. Retry at most 3 attempts. Return `{ ok, version, fingerprint, data (panel fields, live), savedAt }`. Keep `saveGroup` only if something else still calls it; otherwise remove it and its tests. Make T005 pass.
- [X] T014 Add `SavePanelResult` to `src/lib/settings/types.ts` (contracts/panel-actions.md) and remove `SaveSettingsResult` if it is no longer used.
- [X] T015 Add `getAdminPanels(group, panelKeys)` to `src/lib/settings/admin.ts`. It reads the group once and, for each panel, returns `{ data (panel fields, live, defaults merged), fingerprint, lastSaved: { by, at } | null }`. `lastSaved` comes from `panelSaves[panel]`, else the record's `updatedBy`/`updatedAt`, else null. The function stays server-only. Callers must check access first, as documented.
- [X] T016 Replace `saveSettingsGroup` in `settings/actions.ts` with `saveSettingsPanel` (first line `await requireAdminAccess("settings")`) and `savePagesPanel` (first line `await requireAdminAccess("pages")`), following the order of checks in contracts/panel-actions.md. Both call one private helper that does steps 3–10, and on success revalidate exactly as today and log `settings_saved` with `group` and `panel`. Make T006 pass.
- [X] T017 Update `src/test/access-inventory.test.ts`: change the `settings/actions.ts` entry to `{ kind: "action", access: "settings", perAccess: { settings: 1, pages: 1 } }`. Run it and confirm it passes.

**Checkpoint**: `npx vitest run src/lib src/test "src/app/admin/(dashboard)/settings"` is green except the settings pages, which still call the removed action (fixed in US1).

---

## Phase 3: User Story 1 — Find a page's settings under that page's tab (P1) 🎯 MVP

**Goal**: Settings shows tabs (Site-wide, Home, Admission, Resources) with the inventory's panels, in page order, each collapsible with a "View on site" link. Panels save through the new actions.

**Independent Test**: As the main admin, open each tab, compare the panels with the spec's inventory table (titles, order, links), and save one panel per tab; the public page shows the change.

### Tests (write first)

- [X] T018 [P] [US1] Create `e2e/admin-settings-tabs.spec.ts` (main admin):
  - `/admin/settings` → `/admin/settings/site-wide`;
  - the tab bar reads Site-wide, Home, Admission, Resources, in that order;
  - each tab's panel titles and order match contracts/tabs-and-panels.md;
  - each "View on site" `href` matches the contract, and following Home's three links lands with the section in view;
  - each panel toggles with a click and with Enter/Space and reports `aria-expanded`;
  - opening `/admin/settings/home#stats` shows the Stats panel expanded and in view;
  - saving the video panel updates `/` (reuse the helpers in `e2e/helpers/settings.ts`);
  - `/admin/settings/about`, `/academics` and `/careers` return the not-found page;
  - with the `video` group's read forced to fail (use the existing settings read-failure seam if there is one; otherwise add a test-only cookie seam like `e2e-academics-media`, guarded by `freshReadsForTests()`), Home shows `settingsCopy.panelUnavailable` on the Why Choose video panel, and the Hero and Stats panels still render;
  - axe passes on each tab (reuse the axe helper used by the existing admin specs).
- [X] T019 [P] [US1] Create `src/components/admin/settings/settings-panel.test.tsx` (Vitest + Testing Library):
  - the toggle button sets `aria-expanded` and `hidden` on the body;
  - a collapsed body keeps its input values;
  - a matching `location.hash` on mount expands the panel;
  - the "View on site" link is outside the toggle button;
  - rerendering `SettingsPanelForm` with new `initial` props (simulating the refresh after a sibling save) keeps the typed edits, the dirty state and the original fingerprint.

### Implementation

- [X] T020 [P] [US1] Add fragment ids with the `anchor-section` class: `id="hero"` on the hero section root in `src/components/home/hero-slider.tsx`, `id="why-choose"` on the Why Choose block in `src/components/home/inspiration-why-choose.tsx`, and `id="progress-dashboard"` on the section in `src/components/home/progress-dashboard.tsx`. Keep every existing `data-testid`. Run `src/components/home` unit tests and `e2e/admin-home-page.spec.ts`.
- [X] T021 [US1] Create `src/components/admin/settings/settings-panel.tsx` (client), following the markup rules in contracts/tabs-and-panels.md:
  - `<section id={anchor} aria-labelledby>` containing a sticky header row and a body;
  - the header row holds an `h2` wrapping the toggle `<button aria-expanded aria-controls>`, a slot for the unsaved badge (prop `dirty`), and the "View on site" link;
  - the body is hidden with the `hidden` attribute when collapsed;
  - an effect opens the panel and calls `scrollIntoView` when `location.hash === "#" + anchor`, on mount and on `hashchange`;
  - optional `status` and `warning` lines, moved from `settings-group-view.tsx` with the same `data-testid`s and roles.

  The sticky `top` offset must use the admin top bar's existing height token (find it in `src/app/globals.css` / `src/components/admin/admin-top-bar.tsx`; if none exists, add one per Constitution VII). Make T019 pass.
- [X] T022 [US1] Turn `src/components/admin/settings/settings-group-form.tsx` into the panel form, renamed to `settings-panel-form.tsx` with every import updated:
  - props `{ panel: PanelKey; initial: { data, fingerprint, lastSaved }; readOnly?: boolean; onDirtyChange?: (dirty: boolean) => void }`;
  - uses `panelDefinition(PANELS[panel])` for fields and client validation;
  - sends `{ panel, expectedFingerprint, data }` to `saveSettingsPanel` or `savePagesPanel`, chosen by `PANELS[panel].saveAccess`;
  - on success stores the returned fingerprint, data and lastSaved;
  - toasts map exactly as today; the "Last saved" line uses `lastSaved`.

  Key the form `key={panel}` in every tab page. Never key it on `initial.version` or `fingerprint`, unlike today's `settings-group-view.tsx:33` (research R4, "Client side").

  For now keep `useUnsavedChanges` inside the form (US4 replaces it). Leave `readOnly` unimplemented (US2).
- [X] T023 [US1] Replace `src/components/admin/settings/settings-nav.tsx` with the tab bar. It takes `tabs: { key, label, href }[]` from the server and renders `<nav aria-label={settingsCopy.tabsNavLabel}>` with links, `aria-current="page"` on the active tab, and active also for `/admin/settings/resources/gallery/*`. Use `flex-nowrap` with `overflow-x-auto` (US5 finishes the narrow-screen behaviour).
- [X] T024 [US1] Update `settings/layout.tsx`: get the session with `getAdminSession()`, compute `visibleTabs(session)` (presentation only; with no session pass an empty list) and pass it to the tab bar. Keep the comment that the layout is not an access gate.
- [X] T025 [US1] Rewrite `settings/page.tsx`: `await requireAdminPage("settings_or_pages")`, then `redirect` to `/admin/settings/site-wide` if `canAccess(session, "settings")`, else `/admin/settings/home`.
- [X] T026 [P] [US1] Create `settings/site-wide/page.tsx`: `await requireAdminPage("settings")`; `getAdminPanels("contact", ["contact"])`; render one `SettingsPanel` with `SettingsPanelForm`; `metadata.title "Site-wide"`; `dynamic = "force-dynamic"`.
- [X] T027 [P] [US1] Create `settings/home/page.tsx`: `await requireAdminPage("pages")`; read the `hero`, `video` and `stats` panels with `Promise.allSettled` (one `getAdminPanels` call per group); render the Hero slides, Why Choose video and Progress dashboard panels in that order. A rejected group renders its panel with `settingsCopy.panelUnavailable` and no form; the rest of the tab renders.
- [X] T028 [US1] Rewrite `settings/admission/page.tsx`: `await requireAdminPage("settings_or_pages")`; one `getAdminPanels("admission", ["admission-window","admission-messages","admission-classes"])`; render three panels in order. The 020 status line goes on `admission-window` (as `status`) and the 013 "open but no classes" warning on `admission-classes` (as `warning`), both computed from the stored values as today.
- [X] T029 [US1] Move the gallery admin into the Resources tab:
  - `git mv` `settings/gallery/[albumId]/page.tsx` → `settings/resources/gallery/[albumId]/page.tsx`;
  - `git mv` `settings/gallery/actions.ts` and `actions.test.ts` → `settings/resources/gallery/`;
  - create `settings/resources/page.tsx` that renders the existing album list inside a `SettingsPanel` (`photo-gallery`) with no `SettingsPanelForm`;
  - every page and action uses `await requireAdminPage("pages")` / `await requireAdminAccess("pages")`;
  - update every `/admin/settings/gallery` href and `revalidatePath` in `src/components/admin/gallery/*.tsx`, the moved actions, `e2e/helpers/gallery.ts` and `src/lib/cloudinary.ts` comments to `/admin/settings/resources…`;
  - delete the old `settings/gallery/page.tsx`.
- [X] T030 [US1] Delete `settings/contact/`, `settings/hero/`, `settings/stats/`, `settings/video/` and `src/components/admin/settings/settings-group-view.tsx`, once nothing imports it.
- [X] T031 [US1] Update `EXPECTED` in `src/test/access-inventory.test.ts` to match contracts/access-matrix.md:
  - remove the old group pages and the old gallery entries;
  - add `settings/site-wide/page.tsx` (settings), `settings/home/page.tsx` (pages), `settings/resources/page.tsx` (pages), `settings/resources/gallery/[albumId]/page.tsx` (pages) and `settings/resources/gallery/actions.ts` (action, pages);
  - set `settings/page.tsx` and `settings/admission/page.tsx` to `settings_or_pages`.
- [X] T032 [US1] Update `adminExtraPageTitles` in `src/content/admin.ts`: remove the five old paths and add `/admin/settings/site-wide` "Site-wide", `/admin/settings/home` "Home", `/admin/settings/admission` "Admission" and `/admin/settings/resources` "Resources". Check the top-bar title for an album page still resolves (it inherits as before).
- [X] T033 [US1] Update the existing settings E2E specs to the new URLs and panel structure: `e2e/helpers/settings.ts`, `e2e/admin-settings-contact.spec.ts`, `-hero`, `-stats-video`, `-admission`, `-saving`, `-uploads` and `-layout`, plus `e2e/admin-gallery-*.spec.ts` and `e2e/admin-resources-gallery.spec.ts`. Replace selectors on the old `settings-group-title` with panel headings. Run them and diff against `baseline-failures.txt`.
- [X] T034 [US1] Create `src/lib/settings/panels-roundtrip.test.ts` (DB test env), proving SC-002:
  - seed every group with realistic stored values: contact with all social links, two hero slides plus one soft-deleted, video, stats, and admission with dates, both messages and three classes plus one soft-deleted;
  - snapshot the `settings` records;
  - for every group panel in `PANELS`, read it with `getAdminPanels` and save it unchanged with `savePanel`;
  - assert that each record's `data` deep-equals its snapshot, soft-deleted items included, and that only `version`, `updatedAt`, `updatedBy` and `panelSaves` differ.

**Checkpoint**: US1 independent test passes; T018 green; inventory green.

---

## Phase 4: User Story 2 — Each tab has its own permission (P1)

**Goal**: Each user sees the tabs and panels their permissions allow; read-only panels for view-without-save; the server refuses everything else; the Pages grant keeps existing access.

**Independent Test**: The three access cases for every new URL and action pass; crafted cross-permission saves are refused with nothing changed; Pages-only and Settings-only users see the tab bars and read-only panels in contracts/access-matrix.md.

### Tests (write first)

- [X] T035 [P] [US2] Create `e2e/admin-settings-tab-access.spec.ts`. Create content managers through the existing roles helpers: Pages only, Settings only, and neither. For each:
  - check the tab bar contents and where `/admin/settings` lands;
  - check that a forbidden tab URL lands on `/admin?denied=1`;
  - on Admission, check which panels are read-only (a disabled fieldset, no Save button, the "needs …" line) and which are editable;
  - for the user with neither permission, check that the sidebar has no Settings item.

  Run axe on the Admission tab for the Pages-only and Settings-only views.
- [X] T036 [P] [US2] Add the page rows from contracts/access-matrix.md to `e2e/admin-roles-access-matrix.spec.ts`: no session, missing permission and correct permission for `/admin/settings`, `/site-wide`, `/home`, `/admission`, `/resources` and `/resources/gallery/[albumId]`, and the six old URLs plus an album URL. For the old URLs, import the same case table that `e2e/admin-settings-redirects.spec.ts` uses, so the matrix lists them.
- [X] T037 [P] [US2] Update `src/app/api/admin/access-matrix.test.ts` and `src/app/api/admin/settings/uploads/sign/route.test.ts` so the signer requires `pages`: a Settings-only session → 403, a Pages-only session → 200.
- [X] T038 [P] [US2] Update the moved `settings/resources/gallery/actions.test.ts` three-case tests to `pages`, adding "Settings-only → forbidden".
- [X] T039 [P] [US2] Create `src/lib/users/grant-pages.test.ts` (DB test env). Seed a content manager with `["settings"]`, one with `["settings","pages"]`, one with `["news"]`, a deleted one with `["settings"]`, a disabled one with `["settings"]` and a main admin. Check that:
  - the first run adds `pages` only to the active and disabled Settings holders, and writes exactly 2 `permissions_changed` entries (`added: ["pages"]`, `removed: []`, actor `system:014-grant-pages`);
  - no other field or permission changes;
  - a second run changes 0 accounts and writes 0 entries;
  - the function returns the changed count;
  - `grantPagesToSettingsHolders({ dryRun: true })`, run on a fresh seed, returns the would-change accounts (email, permissions) and `changed: 0`, and afterwards no account and no change record differ from before.
- [X] T040 [P] [US2] Add a unit test for the panel form's read-only mode (`src/components/admin/settings/settings-panel-form.test.tsx`): `readOnly` renders a disabled fieldset, no submit button and the `readOnly.needs` line, and never calls a save action.

### Implementation

- [X] T041 [US2] Implement `readOnly` in `src/components/admin/settings/settings-panel-form.tsx`: wrap the fields in `<fieldset disabled>`, hide the Save button, and show `settingsCopy.readOnly.needs(PERMISSION_LABELS[saveAccess])`. Make T040 pass.
- [X] T042 [US2] In `settings/admission/page.tsx`, pass `readOnly={!canSavePanel(session, PANELS[key])}` to each panel, using the session returned by `requireAdminPage`.
- [X] T043 [US2] Move the upload signer to Pages: `await requireAdminAccess("pages")` in `src/app/api/admin/settings/uploads/sign/route.ts`. Update the inventory entry to `pages`. Make T037 pass.
- [X] T044 [US2] Change the Settings sidebar item's access to `"settings_or_pages"` in `adminNavItems` (`src/content/admin.ts`). Check that `src/components/admin/app-sidebar.test.tsx` still passes, and add a case: a Pages-only user sees Settings.
- [X] T045 [US2] Create `src/lib/users/grant-pages.ts` with `grantPagesToSettingsHolders({ dryRun }: { dryRun?: boolean } = {}): Promise<{ changed: number; accounts: { email: string; permissions: string[] }[] }>`, per research R14. In a dry run it lists the matching accounts and skips the update and the change record. Otherwise:
  - query the `user` collection (as `src/lib/users/queries.ts` does) for `role: "content_manager"` (and a missing role, which reads as content manager), `deletedAt: null`, `permissions: "settings"`, `permissions: { $ne: "pages" }`;
  - for each, run `updateOne({ _id, deletedAt: null, permissions: { $ne: "pages" } }, { $addToSet: { permissions: "pages" } })`;
  - only when `modifiedCount === 1`, call `recordUserChange` with actor `{ actorId: "system", actorEmail: "system:014-grant-pages" }`, type `permissions_changed`, details `{ added: ["pages"], removed: [] }`, and log `user_access_changed`.

  Make T039 pass.
- [X] T046 [US2] Create `scripts/grant-pages.ts`, modelled on `scripts/migrate-gallery.ts` (loadEnvConfig, connect, run, exit codes, disconnect), and add `"grant:pages": "tsx scripts/grant-pages.ts"` to `package.json`.
  - Parse `--dry-run`.
  - Before anything else, print the connected database host and name, taken from the Mongoose connection (never the connection string or a password).
  - Then print one line per account (email, current permissions, "+ pages"), then `Would grant Pages to N accounts` (dry run) or `Pages granted to N accounts`.

  Do NOT run it against any database; the user runs it at release (quickstart.md, Release order).
- [X] T047 [US2] Run `e2e/admin-settings-tab-access.spec.ts`, `e2e/admin-roles-access-matrix.spec.ts`, `src/app/api/admin/access-matrix.test.ts`, the gallery actions test and `src/test/access-inventory.test.ts`; fix until green.

**Checkpoint**: US1 and US2 both pass on their own.

---

## Phase 5: User Story 3 — Old links still work (P2)

**Goal**: Every old Settings URL lands on its new tab and panel.

**Independent Test**: Each old URL from the spec inventory, requested as the main admin, lands on the right tab with the panel in view; a forbidden user gets the destination's denial.

- [X] T048 [P] [US3] Create `e2e/admin-settings-redirects.spec.ts`, with the cases in one exported table (T036 imports it). For each of the six old URLs in contracts/tabs-and-panels.md "Old URLs" and one album URL (a real id from the gallery helper), test all three access cases:
  - **no session**: the first response is 308 (checked with `request.get(url, { maxRedirects: 0 })`), and following it ends at `/admin/login` with `next` equal to the destination path;
  - **missing permission**: a Pages-only user on `/admin/settings/contact`, and a Settings-only user on `/admin/settings/hero`, `/video`, `/stats`, `/gallery` and the album URL, each land on `/admin?denied=1`;
  - **correct permission**: the main admin lands on the destination URL with the hash, and that panel is expanded and in view.
- [X] T049 [US3] Add the six permanent redirects to `redirects()` in `next.config.ts`, with a comment `// 014: Settings moved into page tabs`. Read `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md` first for hash and param handling. Restart dev and make T048 pass.
- [X] T050 [US3] Search `src/`, `e2e/` and `docs/` for any remaining `/admin/settings/(contact|hero|stats|video|gallery)` string (Grep) and update each, except in `next.config.ts` and `e2e/admin-settings-redirects.spec.ts`.

---

## Phase 6: User Story 4 — Never lose unsaved work (P2)

**Goal**: One leave warning per tab, a per-panel sticky "Unsaved changes" badge, and sibling saves that never interfere.

**Independent Test**: Edit two Admission panels and save one; the other keeps its edits and badge and then saves without conflict; leaving the tab warns once.

### Tests (write first)

- [X] T051 [P] [US4] Create `e2e/admin-settings-panels.spec.ts` (main admin):
  - edit the Admission messages and the window, save messages, **wait for the save toast and the page refresh to finish**; the window keeps its typed value, its badge and an enabled Save; save the window → success toast, no conflict;
  - collapse a dirty panel → the badge is still visible on its header;
  - scroll so that only the lower part of a long dirty panel (Hero) is on screen → its header and badge are still visible;
  - with one dirty panel, click the Home tab → exactly one confirm dialog (count `page.on("dialog")`); dismiss → still on Admission with edits; accept → navigates;
  - "View on site" and a sidebar link also warn;
  - two browser contexts: A saves messages, then B saves messages with its stale form → conflict toast, B's edits kept, stored value is A's.
- [X] T052 [P] [US4] Create `src/components/admin/settings/unsaved-panels.test.tsx`: the provider reports dirty when any panel is dirty and clean when all are clean, and with two dirty panels a guarded link click calls `window.confirm` once.

### Implementation

- [X] T053 [US4] Create `src/components/admin/settings/unsaved-panels.tsx` (client), per research R8:
  - `UnsavedPanelsProvider` keeps a `Set` of dirty panel keys and calls `useUnsavedChanges(set.size > 0, settingsCopy.unsavedPrompt)` once;
  - `useReportUnsaved(panelKey, dirty)` registers and unregisters on unmount.

  Make T052 pass.
- [X] T054 [US4] In `src/components/admin/settings/settings-panel-form.tsx`, remove the direct `useUnsavedChanges` call and call `useReportUnsaved(panel, dirty)` and `onDirtyChange?.(dirty)` instead. In `settings-panel.tsx`, show the badge (`data-testid="panel-unsaved"`, text `settingsCopy.unsavedBadge`) from the form's dirty state, through a small client wrapper or context, so the badge sits in the sticky header.
- [X] T055 [US4] Wrap the panels of each tab page in `UnsavedPanelsProvider`: `settings/site-wide/page.tsx`, `home/page.tsx`, `admission/page.tsx` and `resources/page.tsx` (Resources has no panel form, so it is a no-op there, but it keeps the pattern).
- [X] T056 [US4] Run `e2e/admin-settings-panels.spec.ts`; in `src/components/admin/settings/settings-panel.tsx`, check that the sticky header does not cover the field under focus when tabbing through a panel (add `scroll-margin-top` on form controls if needed, using the same token as T021).

---

## Phase 7: User Story 5 — Tab bar works on phones (P3)

**Goal**: One scrolling row at every width, with the active tab in view.

**Independent Test**: At 320 px and 375 px the bar is one row, scrolls on its own, shows the active tab, and the page has no horizontal overflow.

- [X] T057 [P] [US5] Add to `e2e/admin-settings-tabs.spec.ts`, at 320 and 375 px:
  - all tab links share one `offsetTop`;
  - `document.documentElement.scrollWidth <= innerWidth`;
  - the active tab's bounding box is inside the bar's box on `/admin/settings/resources` (the last tab);
  - Tab-key focus scrolls the focused link into view;
  - the active link has `aria-current="page"`.
- [X] T058 [US5] Finish the tab bar in `src/components/admin/settings/settings-nav.tsx`:
  - the bar gets `min-w-0 max-w-full`, the links `shrink-0 whitespace-nowrap`;
  - on mount, `scrollIntoView({ inline: "nearest", block: "nearest" })` on the active link;
  - on `focus`, the same for the focused link;
  - a visible focus ring;
  - no scrollbar-hiding hacks that remove the scroll affordance.

  Make sure the parent `settings/layout.tsx` container allows shrinking (`min-w-0`). Make T057 pass.

---

## Phase 8: Polish & Cross-Cutting

- [X] T059 [P] Update `docs/architecture.md` Settings section: tabs, the panel registry, partial saves with fingerprints (link ADR-0013), the two actions, `settings_or_pages`, and the `grant:pages` release step.
- [X] T060 [P] Update `specs/011-roles-and-users/contracts/access-matrix.md` and `specs/005-settings/contracts/access-matrix.md` with a one-line pointer: "Superseded for Settings by specs/014-page-settings/contracts/access-matrix.md".
- [X] T061 Check every tab at 375, 768, 1024 and 1440 px against the existing admin design tokens (no raw values; Constitution VII): sticky header offset, badge and tab bar colours. Fix any raw value by adding or using a token in `research/design-tokens.md` / `src/app/globals.css`.
- [ ] T062 Run `npm run lint` and `npx vitest run` (all), then `npm run build` on its own, then the Playwright suites from quickstart.md on their own. Diff the failure set against `specs/014-page-settings/baseline-failures.txt` and fix every new failure.
- [ ] T063 Walk through quickstart.md "Local check" steps 1–8 by hand and note any deviation in the PHR.
- [ ] T064 Mark `history/adr/0013-settings-panels-partial-save-and-permissions.md` as Accepted only if the user approves it (ask; never change the status unprompted).

---

## Dependencies & Execution Order

```
Phase 1 (T001)
   └─► Phase 2 Foundation (T002–T017)
          └─► US1 (T018–T034)  ◄── MVP
                 ├─► US2 (T035–T047)   needs US1's tab pages + panel form
                 ├─► US3 (T048–T050)   needs US1's routes
                 ├─► US4 (T051–T056)   needs US1's panel + form
                 └─► US5 (T057–T058)   needs US1's tab bar
                        └─► Polish (T059–T064)
```

- US2, US3, US4 and US5 are independent of each other once US1 is done. Their file overlaps:
  - US2 and US4 both edit `settings-panel-form.tsx` and `admission/page.tsx`, so run them one after the other or agree on the order (US2 first).
  - US3 touches only `next.config.ts` and its spec.
  - US5 touches only `settings-nav.tsx`, `settings/layout.tsx` and its spec.
- Within a phase: tests first (they must fail), then implementation; `[P]` tasks touch different files.
- The grant (T045–T046) is code only. Running `npm run grant:pages` is a release step for the user (quickstart.md "Release order"), before deploying.

## Parallel Examples

- **Foundation tests**: T002, T003, T004, T005, T006 together; then T007, T008, T009 together; then T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017.
- **US1**: T018, T019 and T020 together; T026 and T027 together after T021–T025.
- **US2**: T035–T040 together; then T041 → T042; T043, T044 and T045 → T046 in parallel.
- **After US1**: US3 (T048–T050) and US5 (T057–T058) can run alongside US2 or US4.

## Implementation Strategy

1. **MVP = Foundation + US1.** Settings by page works for the main admin, with saves on the new actions and the old save path gone. Stop and validate with the US1 independent test.
   - Do not ship to production at this point: until US2 is done, content managers with Pages see tabs, but read-only panels and the grant are missing.
2. **Add US2 next (also P1).** This makes the slice safe to release: permissions, read-only panels and the grant script.
3. **Then US3 (redirects) and US4 (unsaved work)**, then **US5** (phone tab bar).
4. **Polish.**
5. **Release** (quickstart.md, Release order), against production, before deploying:
   1. `npm run grant:pages -- --dry-run`, then check the database host and the account list;
   2. `npm run grant:pages`;
   3. deploy;
   4. check.

## Task Count

| Phase | Tasks |
|---|---|
| Setup | 1 |
| Foundational | 16 |
| US1 | 17 |
| US2 | 13 |
| US3 | 3 |
| US4 | 6 |
| US5 | 2 |
| Polish | 6 |
| **Total** | **64** |

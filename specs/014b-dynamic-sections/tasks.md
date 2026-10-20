---
description: "Tasks for 014b-dynamic-sections (Syllabi, Examination, Class Levels, Portal Links)"
---

# Tasks: Dynamic Sections (014b)

**Input**: `specs/014b-dynamic-sections/`: plan.md, spec.md (Clarifications Q1–Q6, Deviations), research.md (R1–R17), data-model.md, contracts/ (panel-actions, access-matrix, public-sections, scripts), quickstart.md; ADR-0014.
**Tests**: Required. Constitution XI requires an E2E test per user story, three access cases for every admin entry point, and checks at 375/768/1024/1440 px. The contracts list guarantees that must be proven by tests.
**Organization**: a shared foundation, then one phase per spec user story:
- US1 Portal Links (P1)
- US2 Class Levels + checklist (P1)
- US3 class-link migration (P1)
- US4 Syllabi (P2)
- US5 Examination (P2)
- US6 seed scripts + "Mark as confirmed" (P3)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US6 from spec.md
- Paths are from the repo root. `settings/` means `src/app/admin/(dashboard)/settings/`, and `lib/settings/` means `src/lib/settings/`

**Working rules for every task** (project memory, CLAUDE.md):
- Read the relevant guide in `node_modules/next/dist/docs/` before using any Next API not already used in this repo.
- Never run `npm run build` and Playwright at the same time. Pre-start the dev server before Playwright, with the Playwright env vars (see `playwright.config.ts`).
- About 35 admin E2E tests already fail on unchanged code. Compare failure **sets**, not totals.
- DB-backed unit tests run through `scripts/with-test-env.sh`, following the pattern and hook timeouts in `lib/settings/mutations.test.ts`.
- Docs in `specs/` use CRLF line endings. Keep them when editing.
- All public text is plain: never use `dangerouslySetInnerHTML`. New copy goes in `src/content/admin.ts` or the page content files, never inline in components (Constitution IX).
- Design values come from existing tokens. Add a missing value to `research/design-tokens.md` and `src/app/globals.css` first (Constitution VII).

---

## Phase 1: Setup

**Purpose**: Make sure slice 1 is the base, and record the baseline.

- [X] T001 Confirm with the user that 014 slice 1 is committed on `014-page-settings` (its T066–T068 were open when 014b was specified), and that `014b-dynamic-sections` contains that commit. Do not commit anything yourself unless the user asks. If slice 1 is still uncommitted, stop and ask.
- [ ] T002 Record the failure set before any change. Run `npx vitest run`, then (dev server pre-started) `npx playwright test e2e/admin-settings-*.spec.ts e2e/registration*.spec.ts e2e/admin-registrations*.spec.ts e2e/admission*.spec.ts e2e/page-sections.spec.ts e2e/admin-roles-access-matrix.spec.ts e2e/site-shell*.spec.ts`, one run after the other. Save the failing test titles to `specs/014b-dynamic-sections/baseline-failures.txt`.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: The shared pieces every story needs:
- the pending flag field;
- the new log events;
- the panel editor slot and the per-panel check seam;
- the dynamic-sections resolver;
- the paragraph helper;
- the removed-item change record (spec FR-007);
- the shared layout-check helper (widths 375/640/768/1024/1440, no horizontal scroll, no overlap).

Nothing user-visible changes yet.

**⚠️ No user story starts before this phase is done.**

### Tests first (write, see them fail)

- [ ] T003 [P] Create `src/lib/text/paragraphs.test.ts` for `toParagraphs(text)`:
  - splits on one or more blank lines (`/\n\s*\n/`);
  - folds single newlines inside a paragraph to a space;
  - trims each paragraph;
  - drops empty ones;
  - `""` → `[]`;
  - `"<b>x</b>"` is returned unchanged as text.
- [ ] T004 [P] Create `src/lib/page-sections/dynamic.test.ts` for `visibleSections(page, presence)`:
  - Academics with `{ syllabi: false, examination: true }` → `academic-overview, examination, teachers-training, hifz-e-quran`;
  - Admission with `{ "class-levels": false }` → `admission-procedure, uniform`;
  - all true → the full lists in pageSections order;
  - non-dynamic sections are never removed.
- [ ] T005 [P] Extend `lib/settings/mutations.test.ts`:
  - a `savePanel` call never changes a document's `pendingConfirmation` (seed a document with `pendingConfirmation: { source: "x", seededAt }`, save a panel, and expect it unchanged);
  - a registered panel check that returns `{ ok: false, error: "conflict" }` makes `savePanel` return `conflict` and write nothing;
  - a check that returns `{ ok: true, data }` has its `data` stored;
  - **change record** (spec FR-007): a save that removes a hero slide writes one `settingsChanges` entry (`group`, `panel`, `actorEmail`, `at`, `removed[0].value` = the full slide); a save that only reorders or edits writes none; a `conflict` writes none; when the insert throws twice (mock `SettingsChange.create`), the save still returns success and `settings_change_record_failed` is logged once.

  Use a test-only check registered through the exported registry, and remove it in `afterEach`.
- [ ] T006 [P] Create `src/lib/settings/removed-items.test.ts` for `removedItems(def, before, after)`, using a test definition with a three-level nested list (levels → subjects → groups):
  - an item missing from `after` (matched by `id`) is returned with its `path` as before the save (`levels.2.subjects.0`), a readable `label` ("Class 3 · English") and its full `value`;
  - a removed level is returned once, with its subjects and groups inside `value`, not once per child;
  - reordering, renaming or editing items returns `[]`;
  - a top-level list (hero slides) works the same;
  - `before` empty → `[]`.

### Implementation

- [ ] T007 [P] Create `src/lib/text/paragraphs.ts` exporting `toParagraphs(text: string): string[]`, matching T003.
- [ ] T008 [P] Add optional `pendingConfirmation` to `src/models/settings.ts`. In the schema it is `{ type: Schema.Types.Mixed, required: false }`. In `SettingsDoc` it is `pendingConfirmation?: { source: string; seededAt: Date } | null`. Extend the doc comment: it is set only by `seed:sections --confirm`, cleared only by the confirm actions, and never part of `data` or a fingerprint (data-model.md).
- [ ] T009 [P] In `src/lib/log.ts`, add the event types `settings_confirmed`, `settings_seeded` and `classes_linked`, and optional fields `counts?: Record<string, number>` and `actor?: string`, each documented "never content" (data-model.md "Security log").
- [ ] T010 [P] Create `src/models/settings-change.ts`, following `src/models/user-change.ts`: collection `settingsChanges`; fields `group` (string, required), `panel` (string, required), `actorEmail` (string, required), `at` (Date, required), `removed` (array of `{ path: string; label: string; value: Mixed }`, required, non-empty); index `{ group: 1, at: -1 }`; no soft-delete plugin. Doc comment: kept indefinitely, never written for a save that only edits or reorders (data-model.md). Then create `src/lib/settings/removed-items.ts` (pure) exporting `removedItems(def, beforeLive, afterLive)` per research R3; labels use the item's `name`, `heading`, `label` or `title` (first non-empty), else `"<itemLabel> <n>"`. T006 must pass.
- [ ] T011 [P] Create `e2e/helpers/layout.ts` exporting `LAYOUT_WIDTHS = [375, 640, 768, 1024, 1440]` (640 = the reference theme's mobile-menu breakpoint, `research/design-tokens.md`), `expectNoHorizontalScroll(page)` (`document.documentElement.scrollWidth <= innerWidth`) and `expectNoOverlap(page, sectionLocator)`, which fails if any two visible text blocks or controls (headings, `p`, `li`, `td`, `dt`, `dd`, `a`, `button`, `select`, `input`, `textarea`) inside the section have intersecting bounding boxes, ignoring an element and its own ancestors and descendants. Every layout check in this feature uses these.
- [ ] T012 In `lib/settings/panels.ts`, add an optional `editor?: "syllabus" | "classes-checklist"` to `SettingsPanel`, with a doc comment: "a custom editor rendered by SettingsPanelForm instead of the generic fields; same state, schema and save". No panel uses it yet.
- [ ] T013 Create `lib/settings/panel-checks.ts` (server only, `import "server-only"`):
  - Export a type `PanelCheck = (incoming: GroupValue) => Promise<{ ok: true; data: GroupValue } | { ok: false; error: "conflict" } | { ok: false; error: "invalid"; fields: Record<string, string> }>`.
  - Export a registry `PANEL_CHECKS: Partial<Record<PanelKey, PanelCheck>>`, empty for now.
  - Export `registerPanelCheckForTests`/`clearPanelCheckForTests`, guarded so they throw unless `process.env.VITEST`.
- [ ] T014 In `lib/settings/mutations.ts` `savePanel`, after the fingerprint check and before `parseGroup(def, merged)`, run `PANEL_CHECKS[panel.key]` on `incoming`, inside the retry loop:
  - `conflict` → return `{ ok: false, error: "conflict" }`;
  - `invalid` → return it;
  - `ok` → use its `data` as `incoming`.

  Make sure the update's `$set` never names `pendingConfirmation` (it doesn't today; add a comment saying it must stay that way).
- [ ] T015 In `lib/settings/mutations.ts` `savePanel`, after a successful write (create or conditional update), compute `removedItems(def, storedLive, live)` for the panel's fields and, when non-empty, insert one `SettingsChange` (`group`, `panel: panel.key`, `actorEmail`, `at: now`, `removed`). Retry the insert once; if it fails again, `logSecurityEvent({ type: "settings_change_record_failed", group, panel, counts: { removed: n } })` and still return success. Never insert on `conflict`, `invalid` or `unavailable`. Add `settings_change_record_failed` to `src/lib/log.ts`. T005 must pass.
- [ ] T016 In `lib/settings/admin.ts`, add `pending: { source: string; seededAt: string } | null` to `AdminPanel`, filled from the stored document's `pendingConfirmation` (ISO date), or null. Update every `AdminPanel` construction and the test fixtures that build one (`settings-panel-form.test.tsx`, `settings-panel.test.tsx`).
- [ ] T017 In `src/components/admin/settings/settings-panel-form.tsx`, add the editor slot. When `PANELS[panel].editor` is set, render `<PanelEditor kind={…} value={value} onChange={setValue} errors={errors} clearError={clearError} readOnly={readOnly} extra={extra} />` inside the same `<fieldset disabled={readOnly}>` instead of the `FieldControl` map.
  - `extra` is a new optional prop of `SettingsPanelForm` (`extra?: unknown`), passed through for editors that need server data (the checklist's Class Levels).
  - For now, create `src/components/admin/settings/panel-editor.tsx` with a switch that throws for unknown kinds. Stories add the cases.
- [ ] T018 Create `src/lib/page-sections/dynamic.ts`:
  - `DYNAMIC_SECTION_IDS = ["syllabi", "examination", "class-levels"] as const`;
  - `visibleSections(page: "academics" | "admission", presence: Partial<Record<DynamicSectionId, boolean>>)`, which returns `pageSections[page]` without dynamic ids whose presence is not `true`;
  - `resolveDynamicSections()` (in a separate `dynamic-server.ts` with `import "server-only"`), returning `{ syllabi: false, examination: false, "class-levels": false }` for now. Stories replace each `false` with a real read.

  T004 must pass. (The section ids are added to `pageSections` by the stories that add the sections.)
- [ ] T019 In `src/components/site-shell/header.tsx`, map the Academics and Admission children through `visibleSections` with `await resolveDynamicSections()`, alongside the existing About mapping, so the menu and the search index (built from `items`) use it. Update `src/components/site-shell/header.test.tsx` if it exists, otherwise the nearest header test, to mock the resolver.

**Checkpoint**: `npx vitest run` passes (beyond the baseline). The site looks and behaves the same as before.

---

## Phase 3: User Story 1 — Manage the footer Portal Links (Priority: P1) 🎯 MVP

**Goal**: A Settings user manages the footer's Portal Links in Settings → Site-wide. Unsafe URLs are refused, `http://` shows a warning, the footer opens links safely in a new tab and hides when empty, and `/portal/*` redirects to `/`.

**Independent test**: Spec US1 "Independent Test". Save three links (one `http://`) and check the footer on any page. Remove all links: the column disappears and the others reflow. `/portal/lms-app` lands on `/`.

### Tests first

- [ ] T020 [P] [US1] In `lib/settings/schema.test.ts`, add URL option cases:
  - refused: `javascript:alert(1)`, `data:text/html,x`, `/portal/x` (no `allowPath`), `www.example.org`, `https//broken`, `ftp://x.org`, and (with `rejectCredentials`) `https://u:p@x.org` and `https://u@x.org`;
  - accepted: `HTTPS://Example.org/a` and `http://203.0.113.5/login`;
  - leading and trailing spaces are trimmed;
  - existing contact/social URL behaviour is unchanged without the new options.
- [ ] T021 [P] [US1] Create `lib/settings/groups/portal-links.test.ts`:
  - 12 links pass and 13 fail;
  - a label of 40 characters passes and 41 fails;
  - an empty label or URL fails;
  - a whitespace-only label fails;
  - the item fields are `label` and `url`.
- [ ] T022 [P] [US1] In `lib/settings/public.test.ts`, add `toPublicShape("portalLinks", …)`: live links in order, with `insecure: true` for `http://` URLs. The defaults give `links: []`.
- [ ] T023 [P] [US1] In `src/components/admin/settings/field-control.test.tsx` (create it if missing):
  - a URL field with `warnInsecure` shows "Visitors' browsers will mark this site as not secure." only for `http://` values;
  - with `testLink`, a "Test link" link (`target="_blank"`, `rel="noopener noreferrer"`) is rendered and enabled only while the value is valid;
  - clicking it does not call `onChange`.
- [ ] T024 [P] [US1] Create `src/components/site-shell/footer.test.tsx` (or extend the existing test):
  - with links, a `nav` named "Portal Links" lists them in order, each with `target="_blank"`, `rel="noopener noreferrer"`, and an accessible name ending "(opens external site in a new tab)", and the grid has `lg:grid-cols-4`;
  - with `[]`, there is no Portal Links nav or heading, and the grid has `lg:grid-cols-3`.
- [ ] T025 [P] [US1] In `settings/actions.test.ts`, add:
  - `saveSettingsPanel({ panel: "portal-links" })`: the three access cases (no session → `unauthorized`; Pages-only → `forbidden` + `access_denied`; Settings → `success`);
  - `savePagesPanel({ panel: "portal-links" })` from a Pages-only session → `forbidden`, logged, unchanged;
  - an invalid URL → `invalid` with `fields["links.0.url"]`.
- [ ] T026 [P] [US1] Create `src/content/no-portal-links.test.ts`. It walks `src/**/*.{ts,tsx}` (excluding test files) and fails if any file contains `"/portal/` or `'/portal/` or `` `/portal/ ``.
- [ ] T027 [P] [US1] Create `e2e/admin-settings-portal-links.spec.ts` (spec US1 scenarios 1–8):
  - add, reorder and save links as the main admin, then check the footer on `/` and `/contact`;
  - the unsafe inputs show field errors and cannot be saved;
  - the `http://` warning;
  - Test link opens a popup with the URL, and the panel stays unsaved;
  - two-context conflict → the second save shows the conflict toast;
  - remove all links → no Portal Links column at 1024 px and three columns visible;
  - each old slug (`das-portal`, `eportal`, `student-login`, `mail-login`, `lms-app`, `alumni-registration`) at `/portal/<slug>`, and `/portal` itself → final URL `/` (permanent redirect);
  - removing a link and saving writes a `settingsChanges` entry holding the removed link (read through the e2e DB helper);
  - axe on the Site-wide tab;
  - footer checks at every `LAYOUT_WIDTHS` width (`e2e/helpers/layout.ts`): `expectNoHorizontalScroll`, `expectNoOverlap` on the footer, and the column count is 1/1/2/4/4 with links and 1/1/2/3/3 without (375/640/768/1024/1440).

### Implementation

- [ ] T028 [US1] Engine: add `rejectCredentials?: boolean`, `warnInsecure?: boolean` and `testLink?: boolean` to `UrlField` in `lib/settings/types.ts`. In `lib/settings/schema.ts`, have `isAllowedUrl` take the field and refuse a non-empty `url.username`/`url.password` when `rejectCredentials` is set. T020 must pass.
- [ ] T029 [US1] Add `"portalLinks"` to `GROUP_KEYS` in `lib/settings/types.ts`.
  - Create `lib/settings/groups/portal-links.ts`: a `links` list, `maxItems: 12`, `itemLabel: "link"`, `layout: "cards"`, `inlineFields: ["label", "url"]`, `summary: { title: ["label"] }`, `default: []`, with item fields:
    - `label` (text, required, maxLength 40);
    - `url` (url, required, maxLength 2048, `rejectCredentials`, `warnInsecure`, `testLink`).
  - Register it in `lib/settings/registry.ts`.
  - Add labels and hints to `settingsCopy` in `src/content/admin.ts`.

  T021 must pass.
- [ ] T030 [US1] In `src/components/admin/settings/field-control.tsx`, for URL fields with `warnInsecure`, render the warning line (copy `settingsCopy.hints.insecureUrl`) under the input when the trimmed value matches `/^http:\/\//i`, using the existing warning text style.
  - With `testLink`, render an anchor "Test link" (`target="_blank" rel="noopener noreferrer"`).
  - Its `href` is the value when `fieldSchema` accepts it. Otherwise it is rendered `aria-disabled="true"` with no href.

  T023 must pass.
- [ ] T031 [US1] In `lib/settings/public.ts`, add `PublicPortalLinks { links: { id: string; label: string; url: string; insecure: boolean }[] }` to `PublicShapes` and a `portalLinks` case in `toPublicShape`. T022 must pass.
- [ ] T032 [US1] In `lib/settings/panels.ts`, add `"portal-links"` to `PANEL_KEYS` and `PANELS`:
  - `title: titles["portal-links"]`, `anchor: "portal-links"`, `viewOnSite: "/#site-footer"`;
  - `saveAccess: "settings"`, `source: { kind: "group", group: "portalLinks", fields: allFields("portalLinks") }`.

  Make the Site-wide tab `["contact", "portal-links"]`, and add the panel title to `settingsCopy.panels`. Add `id="site-footer"` to the `<footer>` in `src/components/site-shell/footer.tsx` (an anchor target for "View on site"). Update `lib/settings/panels.test.ts` for the new panel and tab order.
- [ ] T033 [US1] In `settings/site-wide/page.tsx`, read and render the `portal-links` panel after `contact`, using the same pattern as the contact panel: `getAdminPanels("portalLinks", ["portal-links"])`, a `SettingsPanel` wrapper, and `SettingsPanelForm` keyed on the panel key.
- [ ] T034 [US1] Footer: in `src/components/site-shell/public-shell.tsx`, read `getPublicSettings("portalLinks")` in parallel with `getContactDetails()` and pass `portalLinks` to `Footer`. In `footer.tsx`:
  - replace the `portalLinks` import with the prop;
  - render the Portal Links `nav` only when it has at least one link;
  - each link is a plain `<a href target="_blank" rel="noopener noreferrer">` with the label, an `<span className="sr-only">{footerContent.externalLinkSuffix}</span>` (" (opens external site in a new tab)", added to `footerContent`), and a lucide `ExternalLink` icon (`aria-hidden`, sized like the other footer icons);
  - the grid class is `lg:grid-cols-4` with links and `lg:grid-cols-3` without.

  T024 must pass.
- [ ] T035 [US1] Retire `/portal`:
  - delete `src/app/(public)/portal/` (the whole folder);
  - in `next.config.ts`, add `{ source: "/portal", destination: "/", permanent: true }` and `{ source: "/portal/:path*", destination: "/", permanent: true }`, with a comment "014b: portal placeholders retired; links are admin-managed";
  - remove `portalLinks` and its comment block from `src/content/site-shell.ts`, and its cases from `src/content/site-shell.test.ts`;
  - grep `src/` and `e2e/` for any other `portal/` reference and repoint it;
  - in `e2e/page-sections.spec.ts`, replace the footer `/portal/` href walk (line ~88) with an assertion that no footer link starts with `/portal`, and change the `/portal/lms-app` visit (line ~99) to expect a redirect to `/`.

  T026 must pass.
- [ ] T036 [US1] Run T020–T027 and fix failures. Update `docs/architecture.md` (Settings section: the `portalLinks` group, the URL options; public: footer links from Settings, `/portal` retired).

**Checkpoint**: US1 independently testable. Portal Links fully admin-managed.

---

## Phase 4: User Story 2 — Manage Class Levels and choose which are open (Priority: P1)

**Goal**: A Pages user edits the Class Levels table (reference date + rows), shown at `/admission#class-levels`. A Settings user ticks open levels in a checklist. The registration form offers exactly the ticked levels (then the not-linked legacy names), and stored registrations never change.

**Independent test**: Spec US2 "Independent Test". Add three levels and see the table with "Age on 31 July". Tick two levels and see them in the form in table order. Rename one: the form shows the new name, and an earlier registration keeps the old one.

### Tests first

- [ ] T037 [P] [US2] Create `src/lib/text/day-month.test.ts`:
  - `isDayMonth`: `"07-31"`, `"02-29"` and `"12-01"` are valid; `"04-31"`, `"13-01"`, `"00-10"`, `"7-31"` and `""` are not;
  - `formatDayMonth("07-31")` → `"31 July"`, `"04-01"` → `"1 April"`.
- [ ] T038 [P] [US2] In `lib/settings/schema.test.ts`, add `dayMonth` field cases (valid/invalid as T037; required; trims), and the admission `classes` item changes:
  - `levelId` defaults to `""` when missing (old stored items);
  - `uniqueText(levelId)` refuses two items with the same non-empty `levelId` and allows many blanks;
  - a name of 60 characters passes and 61 fails.
- [ ] T039 [P] [US2] Create `lib/settings/groups/class-levels.test.ts`:
  - 30 rows pass and 31 fail;
  - a name of 60 characters passes and 61 fails;
  - an age rule of 80 characters passes and 81 fails;
  - duplicate names that differ only in case or spaces ("Class 1", " class  1 ") are refused at `levels.1.name` with the message "Another class level is already called 'Class 1'. Class names must be unique, because registration matches classes by name.";
  - a whitespace-only name or age rule is refused as empty;
  - `ageReferenceDate` defaults to `"07-31"`;
  - an invalid date like `"04-31"` is refused.
- [ ] T040 [P] [US2] Create `src/lib/registration/offered-classes.test.ts` for `offeredClasses(admission, classLevels)`:
  - ticked levels in Class Levels order, not tick order;
  - current names, not the item snapshot;
  - ticked ids with no live level are ignored;
  - not-linked names follow the ticked ones in saved order;
  - case- and space-insensitive duplicates are dropped (first wins);
  - nothing ticked and nothing unlinked → `[]`.
- [ ] T041 [P] [US2] In `src/lib/registration/availability.test.ts`, change the cases to the new inputs:
  - `classes` comes from `offeredClasses` over the `admission` and `classLevels` reads;
  - window open + empty offered list → closed;
  - window open + one not-linked legacy name → open, offering that name (Clarification 1).
- [ ] T042 [P] [US2] Create `lib/settings/panel-checks.test.ts` (DB-backed) for the `admission-classes` check:
  - with live levels A and B, incoming items `{levelId: A, name: "old"}` → `ok`, with `name` replaced by A's current name;
  - an item with `levelId` = a soft-deleted level, or an unknown id → `conflict`;
  - items with `levelId: ""` pass unchanged.

  Then, through `savePanel`, check that a conflict leaves the stored list unchanged.
- [ ] T043 [P] [US2] In `lib/settings/public.test.ts`, add `toPublicShape("classLevels", …)`: live levels in order, `ageHeader` `"31 July"` for the default, and the defaults give `levels: []`.
- [ ] T044 [P] [US2] Create `src/components/admin/settings/classes-checklist.test.tsx`:
  - one checkbox per live level (labelled by name) in level order, checked when an item has that `levelId`;
  - ticking adds an item `{ id: uuid, levelId, name }` through `onChange`, and unticking removes it;
  - not-linked items are listed with a "Link to" select (unticked levels only) and "Remove";
  - linking replaces the item's `levelId` and `name`;
  - a linked item whose level is not live is shown in a warning naming it, with "Clear this warning", which removes it;
  - read-only: every control is disabled.
- [ ] T045 [P] [US2] Create `src/components/admission/class-levels-section.test.tsx`:
  - a table with `<th scope="col">` "Class level" and "Age on 31 July" and one row per level, inside a `hidden md:table` wrapper;
  - a `dl` list per level inside `md:hidden`;
  - `id="class-levels"` on the section;
  - `<b>x</b>` in a name is rendered as text.
- [ ] T046 [P] [US2] In `settings/actions.test.ts`, add:
  - `savePagesPanel({ panel: "class-levels" })`: the three access cases;
  - Settings-only `saveSettingsPanel({ panel: "class-levels" })` → `forbidden`, logged;
  - `saveSettingsPanel({ panel: "admission-classes" })` with a deleted `levelId` → `conflict`.
- [ ] T047 [P] [US2] Create `e2e/admin-settings-class-levels.spec.ts` (spec US2 scenarios 1–9):
  - a Pages user edits rows and the date (1 April), and `/admission#class-levels` shows "Age on 1 April";
  - at 375 and 640 px stacked rows, at 768/1024/1440 px a table; at every `LAYOUT_WIDTHS` width `expectNoHorizontalScroll` and `expectNoOverlap` on `#class-levels`;
  - a duplicate class level name (different case) shows the duplicate-name message and the panel cannot be saved;
  - a Settings user ticks two levels, and `/admission/register` (window open via the test clock) lists them in table order;
  - nothing ticked → Closed message;
  - delete a ticked level as the Pages user → the Admission tab warning names it and the form no longer lists it;
  - rename a ticked level → the form shows the new name, and a registration submitted earlier still shows the old class name in the admin;
  - a Pages-only user sees the checklist read-only, and a Settings-only user sees Class Levels read-only;
  - two-context checklist conflict after a level deletion → conflict toast;
  - axe on the Admission tab and on `/admission`;
  - with Class Levels empty, the section and the "Class Levels" menu/search entry are absent, and `/admission/class-levels` lands on `/admission` with no section.
- [ ] T048 [US2] Update 013's tests to the checklist model (FR-037):
  - `e2e/registration*.spec.ts`, `e2e/admin-settings-admission.spec.ts` and `e2e/helpers/settings.ts`: seed `classLevels` levels and ticked `classes` items (`levelId`), or rely on not-linked names where a test only needs "some class offered";
  - replace every typed-class editor interaction with the checklist;
  - update `settings/admission/page.tsx`-related unit tests and `src/app/api/public/registrations/route.test.ts` if they seed `classes`.

### Implementation

- [ ] T049 [P] [US2] Create `src/lib/text/day-month.ts` exporting `isDayMonth(value)` (month 01–12, day valid for that month in a leap year) and `formatDayMonth(value)` (fixed English month names, no locale). T037 must pass.
- [ ] T050 [US2] Engine: add `DayMonthField` (`type: "dayMonth"`, `default?: string`) to `lib/settings/types.ts`, and a `dayMonth` case in `lib/settings/schema.ts` using `isDayMonth` (message `settingsCopy.errors.dayMonth`). In `src/components/admin/settings/field-control.tsx`, render two labelled native selects (Day 1–31, Month January–December) inside one `fieldset` with a `legend`. The output is `"MM-DD"`, and an impossible combination shows the schema error on save.
- [ ] T051 [US2] Add `"classLevels"` to `GROUP_KEYS`.
  - Create `lib/settings/groups/class-levels.ts` with:
    - `ageReferenceDate` (`dayMonth`, required, default `"07-31"`);
    - a `levels` list: `maxItems: 30`, `itemLabel: "class level"`, `layout: "cards"`, `inlineFields: ["name", "ageRule"]`, `summary: { title: ["name"] }`, `rules: [{ kind: "uniqueText", field: "name", message: settingsCopy.errors.classLevelNameDuplicate }]` (the message names the row and the reason: registration and the migration match classes by name), `default: []`;
    - item fields `name` (text, required, 60) and `ageRule` (text, required, 80).
  - Register it in `registry.ts`, and add copy to `settingsCopy`.

  T039 must pass.
- [ ] T052 [US2] In `lib/settings/groups/admission.ts`:
  - raise `classes` item `name` to `maxLength: 60`;
  - add item field `{ type: "text", key: "levelId", label: labels.levelId, maxLength: 40 }` (not required, so a missing value reads as `""`);
  - add the rule `{ kind: "uniqueText", field: "levelId", message: settingsCopy.errors.classLevelDuplicate }`;
  - update the doc comment (research R5).

  T038 must pass.
- [ ] T053 [US2] In `lib/settings/public.ts`:
  - add `PublicClassLevels` (`ageReferenceDate`, `ageHeader`, `levels`) with its `toPublicShape` case;
  - change `PublicAdmission.classes` to `PublicAdmissionClass[] = { levelId: string; name: string }[]` (live items, saved order);
  - update every reader of `PublicAdmission.classes` (`src/lib/admission/server.ts` if it uses it, `availability.ts`).

  T043 must pass.
- [ ] T054 [US2] Create `src/lib/registration/offered-classes.ts` exporting `offeredClasses(admission: PublicAdmission, classLevels: PublicClassLevels): string[]` per data-model.md. T040 must pass.
- [ ] T055 [US2] In `src/lib/registration/availability.ts`, read `getPublicSettings("classLevels")` in the same `Promise.all`, and use `offeredClasses(...)` for `registrationOpen` and the returned `classes`. Update its doc comment. T041 must pass. The registration page and `src/app/api/public/registrations/route.ts` need no change (they use `availability.classes`). Confirm this by running their tests.
- [ ] T056 [US2] Add the `admission-classes` check to `PANEL_CHECKS` in `lib/settings/panel-checks.ts`:
  - read `Settings.findById("classLevels")`, merge the defaults, and take the live levels (`toLiveValue`);
  - for each incoming item with a non-empty `levelId`: no live level → `{ ok: false, error: "conflict" }`, else set `name` to the level's name.

  T042 must pass.
- [ ] T057 [US2] In `lib/settings/panels.ts`:
  - add `"class-levels"` (title, `anchor: "class-levels"`, `viewOnSite: "/admission#class-levels"`, `saveAccess: "pages"`, `source` group `classLevels`, all fields);
  - set `editor: "classes-checklist"` on `admission-classes`;
  - make the Admission tab `["admission-window", "admission-messages", "class-levels", "admission-classes"]`.

  Update `panels.test.ts`.
- [ ] T058 [US2] Create `src/components/admin/settings/classes-checklist.tsx` (client) per research R5/R15:
  - **props**: `value` (`{ classes: Item[] }`), `onChange`, `errors`, `clearError`, `readOnly`, `extra` (`{ levels: { id; name }[] }`, the live Class Levels in order);
  - a checkbox list;
  - a "Not linked" list with a "Link to" `select` and a "Remove" button;
  - a removed-level warning (`role="status"`) with "Clear this warning";
  - an empty-levels message linking to the Class Levels panel (`#class-levels`);
  - all copy in `settingsCopy.checklist`.

  Add the `classes-checklist` case to `panel-editor.tsx`. T044 must pass.
- [ ] T059 [US2] In `settings/admission/page.tsx`:
  - read `getAdminPanels("classLevels", ["class-levels"])` alongside the admission panels;
  - render the Class Levels panel between the messages panel and the classes panel (read-only unless the user can save Pages);
  - pass `extra={{ levels: <live levels of the Class Levels panel data> }}` to the `admission-classes` form;
  - replace the existing "window open with no class listed" warning so it counts offered classes (ticked live levels + not-linked names) instead of typed names.
- [ ] T060 [US2] Create `src/components/admission/class-levels-section.tsx` (server) per contracts/public-sections.md, using the existing section wrapper and table/border tokens. The labels "Class level", "Age on", the caption and the `dl` terms go in `src/content/admission/page.ts`. T045 must pass.
- [ ] T061 [US2] Public wiring:
  - add `{ id: "class-levels", label: "Class Levels" }` to `pageSections.admission` after `admission-procedure` in `src/content/site-shell.ts`, and replace the 020 comment;
  - remove the explicit `/admission/class-levels` → `/admission` rule from `next.config.ts` (the derived section redirect now covers it);
  - in `src/lib/page-sections/dynamic-server.ts`, set `"class-levels"` from `(await getPublicSettings("classLevels")).levels.length > 0`;
  - in `src/app/(public)/admission/page.tsx`, iterate `visibleSections("admission", await resolveDynamicSections())`, read `getPublicSettings("classLevels")` in the existing `Promise.all`, and render `ClassLevelsSection` for `class-levels`;
  - update `src/app/(public)/admission/page.test.tsx` and `src/content/site-shell.test.ts`.
- [ ] T062 [US2] Run T037–T048 and fix failures. Update `docs/architecture.md` (the `classLevels` group, the `dayMonth` field, the checklist model and offered classes) and the 013 spec's contract note if it describes typed classes (add one line pointing to 014b).

**Checkpoint**: US2 independently testable. The registration list comes from ticked Class Levels.

---

## Phase 5: User Story 3 — Move typed class names onto Class Levels (Priority: P1)

**Goal**: An optional, idempotent manual migration links existing typed class names to Class Levels by name. Unmatched names are reported, kept as "not linked", listed in the Admission tab and still offered.

**Independent test**: Spec US3 "Independent Test". Typed names "Playgroup", "class 1" and "Grade 9" with levels "PlayGroup" and "Class 1". The dry run reports 2 matches and 1 unmatched. `--confirm` ticks two, and "Grade 9" is listed as not linked.

### Tests first

- [ ] T063 [P] [US3] Create `lib/settings/link-classes.test.ts`:
  - **`planClassLinks`** (pure): trims, collapses spaces and ignores case; only live levels; a level already linked by another item → "duplicate"; linked items are skipped.
  - **`linkClasses({ confirm: false })`** (DB-backed): writes nothing.
  - **`linkClasses({ confirm: true })`**: sets `levelId` and `name` on matched items only, leaves unmatched items, sets `panelSaves["admission-classes"].by` to `"system:014b-link-classes"` and logs `classes_linked` with counts.
  - **A second confirm**: "nothing to link" and no write.
  - **A concurrent admin save between read and write**: re-plans, at most 3 attempts.
- [ ] T064 [P] [US3] In `e2e/admin-settings-class-levels.spec.ts`, add a migration display test (spec US3 scenarios 3–4):
  - seed legacy items without `levelId`, and the Class Levels;
  - call `linkClasses({ confirm: true })` through the e2e helper, or seed the post-migration state directly;
  - the Admission tab lists "Grade 9" as Not linked, with Link to / Remove;
  - linking it to a level ticks that level, and the list disappears when empty;
  - before resolving, `/admission/register` offers "Grade 9" after the ticked levels.

### Implementation

- [ ] T065 [US3] Create `lib/settings/link-classes.ts` (server only) per research R6 and contracts/scripts.md: `planClassLinks(admissionLive, classLevelsLive)` and `linkClasses({ confirm }): Promise<LinkReport>`, using a group-version compare-and-set on `admission` (same pattern as `savePanel`, ≤ 3 attempts). T063 must pass.
- [ ] T066 [US3] Create `scripts/link-classes.ts`:
  - parses `--confirm`;
  - connects with the existing script DB helper (as `scripts/grant-pages.ts` does);
  - prints the database host and name from the Mongoose connection;
  - prints the report lines and exit codes from contracts/scripts.md;
  - disconnects.

  Add `"migrate:class-levels": "tsx scripts/link-classes.ts"` to `package.json`. It is never called from build, start or postinstall (Constitution IV).
- [ ] T067 [US3] Run T063–T064 and fix failures. Add the script to the scripts list in `docs/architecture.md` (release steps), and to `specs/014b-dynamic-sections/quickstart.md` if anything differs.

**Checkpoint**: US3 independently testable. Typed names migrate with nothing silently dropped.

---

## Phase 6: User Story 4 — Manage and publish the Syllabi (Priority: P2)

**Goal**: A Pages user edits levels → subjects → groups (heading, intro, topics one per line), with one level open at a time. Visitors see `/academics#syllabi`: ARIA tabs (a picker on phones) with per-level links.

**Independent test**: Spec US4 "Independent Test", with test data (the seed is US6). Arrow keys move between tabs. `#syllabi-class-4` opens Class 4, and picking another level replaces the hash without adding a history entry.

### Tests first

- [ ] T068 [P] [US4] In `lib/settings/schema.test.ts`, add engine cases:
  - **`lines`**: a string `" a \n\n b "` parses to `["a","b"]`; an array input is accepted; the 101st line fails with a message naming the limit; a 201-character line fails with an error at `…topics` naming the line number; blank-only → `[]`.
  - **`maxTotalLines`** over `levels.subjects.groups.topics`: 3,000 pass and 3,001 fail at `levels`.
  - **Nested lists**: nested item ids must be uuids and unique within their list.
- [ ] T069 [P] [US4] In `lib/settings/items.test.ts`, check that `reconcileGroupValue` honours `ListField.maxDeletedRetained` (11 deletions with a cap of 10 keep the 10 newest). Nested lists inside a live level are stored as sent, with no tombstones.
- [ ] T070 [P] [US4] Create `lib/settings/groups/syllabi.test.ts`:
  - levels 20 pass and 21 fail; subjects 10 pass and 11 fail; groups 20 pass and 21 fail;
  - a level/subject name of 60 passes and 61 fails; a heading of 120 passes and 121 fails; an intro of 1,500 passes and 1,501 fails;
  - a group with no intro and no topics fails ("add an intro or at least one topic");
  - a group with only an intro passes;
  - a whitespace-only level or subject name is refused as empty;
  - duplicate level or subject names pass the schema (they only warn in the editor).
- [ ] T071 [P] [US4] Create `src/lib/syllabi/slug.test.ts`:
  - `levelSlugs(["Play Group","Nursery","PREP","Class 1"])` → `["play-group","nursery","prep","class-1"]`;
  - duplicates → `class-1`, `class-1-2`;
  - a name with no ASCII letters → `level-<n>`;
  - accents are stripped (`"Nürsery"` → `nursery`).
- [ ] T072 [P] [US4] In `lib/settings/public.test.ts`, add `toPublicShape("syllabi", …)`:
  - levels with no subjects are removed;
  - slugs are assigned;
  - intro → `paragraphs` via `toParagraphs`;
  - the defaults give `levels: []`.
- [ ] T073 [P] [US4] Create `src/components/admin/settings/syllabus-editor.test.tsx`:
  - only one level is expanded at a time (opening B collapses A);
  - add, rename, move up/down (announced in the live region) and remove levels, subjects **and groups**;
  - removing a level or subject with topics opens a confirm dialog stating "This removes N topics", and cancelling keeps it;
  - removing a group that has topics or an intro also opens a confirm dialog; an empty group is removed at once;
  - two levels (or two subjects in one level) with the same name, ignoring case and spaces, show an inline warning ("Another level is also called 'Class 1'.") and the Save button stays enabled;
  - the topics textarea commits trimmed non-blank lines;
  - groups have heading and intro inputs;
  - a "Preview" link to `/academics#syllabi`;
  - read-only disables everything.
- [ ] T074 [P] [US4] Create `src/components/academics/syllabi-tabs.test.tsx`:
  - `role="tablist"` with one `role="tab"` per level, the first `aria-selected="true"`, roving `tabindex`;
  - ArrowRight/ArrowLeft wrap, and Home/End select;
  - selecting a tab calls `history.replaceState` with `#syllabi-<slug>` and shows only that panel;
  - an initial `location.hash` of `#syllabi-class-4` selects that level, and an unknown slug selects the first;
  - a `hashchange` re-selects;
  - the `select` (phone) changes the level and replaces the hash.
- [ ] T075 [P] [US4] In `settings/actions.test.ts`, add:
  - `savePagesPanel({ panel: "syllabi" })`: the three access cases;
  - Settings-only `saveSettingsPanel({ panel: "syllabi" })` → `forbidden`, logged;
  - a payload over 3,000 topics → `invalid`.
- [ ] T076 [P] [US4] Create `e2e/admin-settings-syllabi.spec.ts` (spec US4 scenarios 1–5, 9, and SC-002):
  - as a Pages user, build two levels with subjects, groups (one with an intro) and topics, reorder, and save, then check `/academics#syllabi`;
  - the remove confirmation with the topic count;
  - limit errors (101 topics in a group);
  - the Preview link;
  - a Settings-only user does not see the Academics tab;
  - two-context conflict;
  - axe on the Academics tab;
  - removing a subject and saving writes a `settingsChanges` entry whose `removed[0].value` is the full subject;
  - **performance**: seed a ~500-topic syllabus via the helper, open a level, type 50 characters into a topics box while observing `PerformanceObserver` `longtask` entries (assert none > 200 ms), then save and assert the success toast appears within 2 s of the click, logging the measured time with `test.info().annotations`. The 1 s target (SC-002) is checked by hand on a production build in the final quickstart walk-through.
- [ ] T077 [P] [US4] Create `e2e/public-dynamic-sections.spec.ts`, Syllabi part (spec US4 scenarios 6–8, 10–11):
  - keyboard tabs at 1024 px;
  - the picker at 375 and 640 px (no tablist visible), the tab row from 768 px;
  - `#syllabi` selects the first level and scrolls the section into view;
  - `#syllabi-class-4` selects Class 4;
  - picking Class 5 changes the hash and `history.length` is unchanged;
  - an unknown slug selects the first;
  - at every `LAYOUT_WIDTHS` width, `expectNoHorizontalScroll` and `expectNoOverlap` on `#syllabi`;
  - axe on `/academics`;
  - empty syllabi → no `#syllabi` section, no "Syllabi" in the Academics menu or search, and `/academics/syllabi` lands on `/academics` at the top.

### Implementation

- [ ] T078 [US4] Engine (`lib/settings/types.ts`, `schema.ts`, `items.ts`):
  - **`LinesField`** (`type: "lines"`, `maxItems`, `maxLength`, `default?: string[]`) and its schema: preprocess a string by splitting on `/\r?\n/`, trimming and dropping blanks; then an array of trimmed strings with per-line max and a count max. Messages use `settingsCopy.errors.lineTooLong(n, max)` and `tooManyLines(max)`.
  - **`GroupRule`** `{ kind: "maxTotalLines"; path: string; max: number; message: string }`, applied in `schemaFor`'s superRefine by walking the dotted path through nested lists.
  - **`ListField.maxDeletedRetained?: number`**, used by `reconcileItems`/`reconcileGroupValue` in place of `MAX_DELETED_RETAINED` when set.

  T068 and T069 must pass. Make sure `collectImages`, `mergeWithDefaults` and `toLiveValue` handle `lines`, treating it as a plain value (add cases to `defaults.test.ts` if needed).
- [ ] T079 [US4] Add a group-level item rule for "intro or topics" as a new `ListRule` kind, `{ kind: "anyOf"; fields: string[]; message }`, checked in `listItemSchema` (at least one of the fields non-empty, where an array counts as non-empty when its length is > 0).
  - Add `"syllabi"` to `GROUP_KEYS`.
  - Create `lib/settings/groups/syllabi.ts` with:
    - a `levels` list (max 20, `maxDeletedRetained: 10`, item fields `name` text 60 required and a `subjects` list);
    - `subjects` (max 10; `name` text 60 required; a `groups` list);
    - `groups` (max 20; `heading` text 120; `intro` longText 1500; `topics` lines max 100 × 200; rule `anyOf ["intro","topics"]`);
    - a group rule `maxTotalLines` over `levels.subjects.groups.topics`, max 3000.
  - Register it, and add copy.

  T070 must pass.
- [ ] T080 [P] [US4] Create `src/lib/syllabi/slug.ts` exporting `levelSlugs(names: string[]): string[]` per research R12. T071 must pass.
- [ ] T081 [US4] In `lib/settings/public.ts`, add `PublicSyllabus` and its `toPublicShape` case (drop levels with no subjects, `levelSlugs` on the remaining names, `toParagraphs` for intros). T072 must pass.
- [ ] T082 [US4] Create `src/components/admin/settings/syllabus-editor.tsx` (client) per research R15:
  - a level list with an accordion (state: the open level id);
  - `React.memo` components `LevelEditor`/`SubjectEditor`/`GroupEditor` keyed by id, receiving their slice and a stable `onChange(id, next)` (`useCallback`);
  - a topics textarea holding local text and committing `split → trim → filter` on change;
  - up/down buttons for levels, subjects and groups, with `settingsCopy.list.moveUp/moveDown` labels and live-region announcements;
  - remove through the existing `AlertDialog` (`src/components/ui/alert-dialog.tsx`): levels and subjects with topics state `settingsCopy.syllabus.removeConfirm(count)`; a group with topics or an intro asks `settingsCopy.syllabus.removeGroupConfirm`; an empty group is removed at once;
  - an inline duplicate-name warning (`settingsCopy.syllabus.duplicateName`) under a level or subject name that matches another in the same list, ignoring case and repeated spaces; it never disables Save;
  - error display by path from `errors`;
  - the Preview link.

  Add the `syllabus` case to `panel-editor.tsx`. T073 must pass.
- [ ] T083 [US4] In `lib/settings/panels.ts`:
  - add the `"syllabi"` panel (`anchor: "syllabi"`, `viewOnSite: "/academics#syllabi"`, `saveAccess: "pages"`, `editor: "syllabus"`, source `syllabi`);
  - set the Academics tab panels to `["syllabi"]` (examination is added in US5).

  Create `settings/academics/page.tsx`:
  - `await requireAdminPage("pages")` as its first awaited call (follow `settings/home/page.tsx`);
  - read `getAdminPanels("syllabi", ["syllabi"])` and render the panel.

  Add the page to `EXPECTED` in `src/test/access-inventory.test.ts` as `{ kind: "page", access: "pages" }`, and update `panels.test.ts`.
- [ ] T084 [US4] Create `src/components/academics/syllabi-section.tsx` (server) and `src/components/academics/syllabi-tabs.tsx` (client island) per contracts/public-sections.md.
  - The server part renders the section (`id="syllabi"`, `anchor-section`, the h2 from the section label) and every panel's content (subject h3, group h4, intro `p`s, `ul > li` topics).
  - It passes `{ levels: { name, slug }[] }` and the rendered panels as children to the island, which controls `hidden` and selection.
  - Copy ("Choose a class", the tablist label) goes in `src/content/academics/`.

  T074 must pass.
- [ ] T085 [US4] Public wiring:
  - add `{ id: "syllabi", label: "Syllabi" }` to `pageSections.academics` after `academic-overview`;
  - change `legacyAcademicsRedirects` `/academics/syllabi` → `/academics#syllabi`, and update the 018 comment;
  - in `dynamic-server.ts`, set `syllabi` from `(await getPublicSettings("syllabi")).levels.length > 0`;
  - in `src/app/(public)/academics/page.tsx`, iterate `visibleSections("academics", await resolveDynamicSections())`, read `getPublicSettings("syllabi")`, and render `SyllabiSection` for `syllabi`;
  - update the Academics page and site-shell tests.
- [ ] T086 [US4] Add an e2e helper `seedSyllabus(levels)` and the ~500-topic fixture (generated, not the seed data) to `e2e/helpers/settings.ts`. Run T068–T077 and fix failures. Update `docs/architecture.md` (the `syllabi` group, `lines`, `maxTotalLines`, nested-list soft delete, the editor slot).

**Checkpoint**: US4 independently testable with test data.

---

## Phase 7: User Story 5 — Manage and publish Examination (Priority: P2)

**Goal**: A Pages user edits heading + body blocks. Visitors see cards at `/academics#examination`, 1 column on phones and 2 from tablet (recorded deviation).

**Independent test**: Spec US5 "Independent Test", with test blocks. Four cards: two per row at 768 px and one at 375 px. A blank line in the body starts a new paragraph.

### Tests first

- [ ] T087 [P] [US5] Create `lib/settings/groups/examination.test.ts`:
  - 20 blocks pass and 21 fail;
  - a heading of 120 passes and 121 fails;
  - a body of 3,000 passes and 3,001 fails;
  - an empty heading or body fails;
  - a whitespace-only heading or body is refused as empty.
- [ ] T088 [P] [US5] In `lib/settings/public.test.ts`, add `toPublicShape("examination", …)`: the body goes through `toParagraphs`, and the defaults give `blocks: []`.
- [ ] T089 [P] [US5] Create `src/components/academics/examination-section.test.tsx`:
  - `id="examination"`, an `h2`, a `ul` with `md:grid-cols-2`;
  - each `article` has an `h3` and one `p` per paragraph;
  - `<script>` in the text is rendered literally.
- [ ] T090 [P] [US5] In `settings/actions.test.ts`, add `savePagesPanel({ panel: "examination" })`: the three access cases, plus Settings-only `saveSettingsPanel` → `forbidden`.
- [ ] T091 [P] [US5] Create `e2e/admin-settings-examination.spec.ts` and add an Examination part to `e2e/public-dynamic-sections.spec.ts` (spec US5 scenarios 1–4):
  - add, edit, reorder and remove blocks as a Pages user and save;
  - public cards in order;
  - 1 column at 375 and 640 px and 2 at 768/1024/1440 px (compare card `offsetTop`s); at every `LAYOUT_WIDTHS` width `expectNoHorizontalScroll` and `expectNoOverlap` on `#examination`;
  - paragraph splitting;
  - literal markup;
  - limit errors;
  - axe on the Academics tab and `/academics`;
  - empty → no section and no menu/search entry, and `/academics/examinations` lands on `/academics`.

### Implementation

- [ ] T092 [US5] Add `"examination"` to `GROUP_KEYS`. Create `lib/settings/groups/examination.ts`: a `blocks` list, max 20, `itemLabel: "block"`, `layout: "cards"`, `inlineFields: ["heading", "body"]`, `summary: { title: ["heading"] }`, `default: []`, with item fields `heading` (text, required, 120) and `body` (longText, required, 3000). Register it, and add copy. T087 must pass.
- [ ] T093 [US5] In `lib/settings/public.ts`, add `PublicExamination` and its case. T088 must pass.
- [ ] T094 [US5] In `lib/settings/panels.ts`, add the `"examination"` panel (`anchor: "examination"`, `viewOnSite: "/academics#examination"`, `saveAccess: "pages"`, source `examination`). The Academics tab becomes `["syllabi", "examination"]`. In `settings/academics/page.tsx`, read and render it after Syllabi. Update `panels.test.ts`.
- [ ] T095 [US5] Create `src/components/academics/examination-section.tsx` (server) per contracts/public-sections.md, reusing the existing card surface, border and spacing tokens. T089 must pass.
- [ ] T096 [US5] Public wiring:
  - add `{ id: "examination", label: "Examination" }` to `pageSections.academics` after `syllabi`;
  - point `legacyAcademicsRedirects` `/academics/examinations` → `/academics#examination`;
  - in `dynamic-server.ts`, set `examination` from `blocks.length > 0`;
  - render `ExaminationSection` in `src/app/(public)/academics/page.tsx`;
  - update the tests.
- [ ] T097 [US5] Run T087–T091 and fix failures. Update `docs/architecture.md`.

**Checkpoint**: US5 independently testable.

---

## Phase 8: User Story 6 — Seed initial content safely (Priority: P3)

**Goal**: Manual seeding of Syllabi, Examination and Portal Links from reviewed, typed data files: a dry run by default, `--confirm` to write, never overwriting, and content marked pending. Panels show an admin-only notice until an admin uses the logged "Mark as confirmed by client".

**Independent test**: Spec US6 "Independent Test". The dry run writes nothing; `--confirm` writes and shows the notice; a second `--confirm` is refused. An edit keeps the notice, and confirming clears it.

### Tests first

- [ ] T098 [P] [US6] Create `lib/settings/seed.test.ts` (DB-backed):
  - for each section, the data file passes its group schema (ids added);
  - a dry run returns a summary with counts and writes nothing;
  - `confirm` on an empty group writes the content with `pendingConfirmation.source` and `updatedBy: "system:014b-seed"` and logs `settings_seeded`;
  - a second `confirm` is refused ("already has content") and writes nothing;
  - a group whose live value is empty but whose document exists (an admin cleared it) is seeded with a version CAS;
  - a version change between read and write → refused, nothing written;
  - the portal-links summary lists the insecure URLs (Student Login).
- [ ] T099 [P] [US6] Create `lib/settings/confirm.test.ts` (DB-backed) for `confirmPanel(panel, actorEmail)`:
  - pending → `changed: true`, the flag is null, `settings_confirmed` is logged, and `version`/`data` are unchanged;
  - a second call → `changed: false`, nothing logged;
  - no document → `changed: false`.
- [ ] T100 [P] [US6] In `settings/actions.test.ts`, add `confirmSettingsPanel` and `confirmPagesPanel` per contracts/panel-actions.md:
  - for each action, the three access cases;
  - an unknown panel or `photo-gallery` → `invalid`;
  - a Pages-only `confirmPagesPanel({ panel: "portal-links" })` → `forbidden`, logged, flag unchanged;
  - a Settings-only `confirmSettingsPanel({ panel: "syllabi" })` → `forbidden`.

  Update `EXPECTED` in `src/test/access-inventory.test.ts` to `perAccess: { settings: 2, pages: 2 }`.
- [ ] T101 [P] [US6] In `src/components/admin/settings/settings-panel.test.tsx`, cover the pending notice:
  - with `pending`, it shows the source and date and a "Mark as confirmed by client" button (editor), or no button (read-only);
  - confirming opens a dialog;
  - on success the notice is removed.
- [ ] T102 [P] [US6] Create `e2e/admin-settings-seeded.spec.ts` (spec US6 scenarios 4–5):
  - seed a pending group directly through a helper that calls `seedSection(..., { confirm: true })` against the test database, or inserts the document with `pendingConfirmation`;
  - the notice is visible to the editor;
  - an edit + save keeps the notice;
  - "Mark as confirmed by client" clears it, and a reload confirms;
  - a Settings-only user on Academics → the tab is hidden; a Pages-only user on Site-wide → the tab is hidden;
  - the Portal Links seeded state shows the not-secure warning on Student Login.

### Implementation

- [ ] T103 [US6] Capture the reference content (research R10) into typed data files with header comments (source URL, capture date) and an `adaptations: string[]` list:
  - **`src/content/seed/syllabi.ts`**: 11 levels from the `/academics/syllabi/` tab panes. Map tabs to panes by the HTML pane ids, not by text order. Play Group's General Information/Fee/Admission Test go in as subjects with groups and intros, H4/H5 headings become groups, paragraphs become intros, and numbered items become topics (recorded in `adaptations`).
  - **`src/content/seed/examination.ts`**: the four blocks verbatim.
  - **`src/content/seed/portal-links.ts`**: the six labels and the reference top-bar `href`s (Student Login's `http://` IP kept as is).

  Fetch the live pages' HTML (e.g. `curl`) into the scratchpad. Do not commit fetched HTML. Every text value must fit the group limits; report anything that doesn't instead of truncating it.
- [ ] T104 [US6] Create `lib/settings/seed.ts` (server only): `SEED_SECTIONS` (`syllabi` → group `syllabi`, data file; `examination`; `portal-links` → `portalLinks`) and `seedSection(section, { confirm }): Promise<SeedReport>`, per research R9 and contracts/scripts.md (ids via `crypto.randomUUID()`, schema validation, the refusal rule on live content, version CAS, `pendingConfirmation`, the `settings_seeded` log). T098 must pass.
- [ ] T105 [US6] Create `scripts/seed-sections.ts`:
  - argument parsing (`<section>`, `--confirm`; a usage line and exit 2 when the section is missing or unknown);
  - DB connect and host/name print as in `scripts/link-classes.ts`;
  - report printing (counts, items, adaptations, insecure URLs) and the exit codes from contracts/scripts.md.

  Add `"seed:sections": "tsx scripts/seed-sections.ts"` to `package.json`. It is never called from build, start or postinstall.
- [ ] T106 [US6] Create `lib/settings/confirm.ts` (server only) exporting `confirmPanel(panel: SettingsPanel, actorEmail: string): Promise<{ changed: boolean }>`, which does one `Settings.updateOne({ _id: group, pendingConfirmation: { $ne: null } }, { $set: { pendingConfirmation: null } })` and logs `settings_confirmed` when `modifiedCount === 1`. T099 must pass.
- [ ] T107 [US6] In `settings/actions.ts`, add `confirmSettingsPanel` and `confirmPagesPanel`:
  - the first awaited call is `requireAdminAccess("settings")` / `requireAdminAccess("pages")`;
  - then the panel lookup (unknown or gallery → `invalid`) and a `saveAccess` match (else `forbidden` + `access_denied` with `panel`);
  - then `confirmPanel`, and `revalidatePath(<tab href>)` on change;
  - a database error → `unavailable`.

  Follow the existing save actions' structure. T100 must pass.
- [ ] T108 [US6] In `src/components/admin/settings/settings-panel.tsx`, add the pending notice under the panel header when `pending` is set: `role="status"`, copy `settingsCopy.pending.notice(source, date)`, and for editors a "Mark as confirmed by client" button opening an `AlertDialog`, then calling the action for the panel's `saveAccess`. Show a toast on the result and hide the notice on `success`. Pass `pending` from each tab page (site-wide, academics). T101 must pass.
- [ ] T109 [US6] Run T098–T102 and fix failures. Dry-run each seed against the **test** database (`scripts/with-test-env.sh npm run seed:sections -- syllabi`), check the summary against the reference page, and note the adaptation list in the PHR. Do NOT run against production: the user decides when (brief).

**Checkpoint**: All six stories are independently testable.

---

## Phase 9: Polish & Cross-Cutting

- [ ] T110 [P] Add the 014b rows from contracts/access-matrix.md to `specs/011-roles-and-users/contracts/access-matrix.md`, and the Academics page rows (no session → login, Settings-only → `/admin?denied=1`, Pages → page) to `e2e/admin-roles-access-matrix.spec.ts`.
- [ ] T111 [P] Check every new public section, the footer and the four admin panels against `research/design-tokens.md` and the reference screenshots (`screenshots/das.edu.pk_academics_syllabi_*.png`, `…examinations_*.png`, `…admission_class-levels_*.png`), at 375, 640, 768, 1024 and 1440 px (640 = the reference theme's own mobile-menu breakpoint, `research/design-tokens.md`), using `e2e/helpers/layout.ts` for horizontal scroll and overlap. Fix any raw value by adding or using a token. Confirm the three recorded deviations match the spec's "Deviations from the reference" and nothing else deviates.
- [ ] T112 [P] Update `docs/architecture.md` once more for coherence: the Settings groups list, engine field types, panel checks, the pending flag, the `settingsChanges` change record and the recovery runbook, the scripts (`seed:sections`, `migrate:class-levels`), and the public dynamic sections. Link ADR-0014.
- [ ] T113 Run `npm run lint` and `npx vitest run` (all), then `npm run build` on its own, then the Playwright suites from quickstart.md on their own (dev server pre-started). Diff the failure set against `specs/014b-dynamic-sections/baseline-failures.txt`, and fix every new failure.
- [ ] T114 Walk through quickstart.md "Local check" steps 1–9 by hand on a production build (`npm run build` then `npm start`), including the 1 s Syllabi save target (SC-002). Then follow the "Recovering a removed item" runbook once: remove a syllabus subject and save, find its `settingsChanges` entry, re-enter it from `removed[0].value` and save, and check the public page shows it again. Note any deviation and the measured times in the PHR.
- [ ] T115 Mark `history/adr/0014-dynamic-sections-as-settings-groups.md` as Accepted only if the user approves it. Ask; never change the status unprompted.

---

## Dependencies & Execution Order

```
Phase 1 (T001–T002)
   └─► Phase 2 Foundation (T003–T019)
          ├─► US1 Portal Links (T020–T036)   ◄── MVP
          ├─► US2 Class Levels + checklist (T037–T062)
          │      └─► US3 Migration (T063–T067)   needs US2's levelId model and checklist
          ├─► US4 Syllabi (T068–T086)
          │      └─► US5 Examination (T087–T097)  needs US4's Academics tab page
          └─► US6 Seeds + confirm (T098–T109)    needs US1 (portal-links), US4 (syllabi), US5 (examination) groups
                 └─► Polish (T110–T115)
```

- **Independent after the Foundation**: US1, US2 and US4. Each touches its own group, panel and public section.
- **Shared files** (edit one after the other, or agree an order: US1 → US2 → US4 → US5 → US6):
  - `lib/settings/types.ts` (`GROUP_KEYS`, engine types);
  - `schema.ts`, `registry.ts`, `panels.ts`, `public.ts`;
  - `field-control.tsx`, `panel-editor.tsx`, `settings/actions.test.ts`;
  - `src/content/admin.ts`, `src/content/site-shell.ts`, `next.config.ts`, `dynamic-server.ts`;
  - `docs/architecture.md`.
- **Within a story**: tests first (they must fail), then implementation. `[P]` tasks touch different files.
- **Scripts**: `migrate:class-levels` and `seed:sections` are code only here. Running them against production is the user's decision (quickstart.md "Release order").

## Parallel Examples

- **Foundation**: T003, T004, T005 and T006 together; then T007, T008, T009, T010 and T011 together; then T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019.
- **US1**: T020–T027 together; then T028 → T029 → T030, with T031 alongside; then T032 → T033, T034 → T035.
- **US2**: T037–T047 together; T049 alongside T050–T052; then T053 → T054 → T055, T056, T057 → T058 → T059, T060 → T061.
- **US4**: T068–T077 together; T080 alongside T078 → T079; then T081, T082 → T083 → T084 → T085.
- **Across stories** (after the Foundation, with the shared-file order respected): one developer on US1 while another drafts US4's tests and the `slug`/`paragraph` helpers.

## Implementation Strategy

1. **MVP = Foundation + US1 (Portal Links).** It replaces six dead footer links and retires a route, and is releasable on its own. Validate with the US1 independent test.
2. **US2 (+ US3)**: Class Levels and the registration checklist. Release when the client has provided levels. The deploy alone changes nothing for parents, and the migration is optional.
3. **US4 → US5**: Syllabi, then Examination (the Academics tab appears with US4).
4. **US6**: seed data and confirm actions, once the reference capture is reviewed.
5. **Polish**, then release per quickstart.md. The scripts run only when the user decides.

## Task Count

| Phase | Tasks |
|---|---|
| Setup | 2 |
| Foundational | 17 |
| US1 Portal Links | 17 |
| US2 Class Levels + checklist | 26 |
| US3 Migration | 5 |
| US4 Syllabi | 19 |
| US5 Examination | 11 |
| US6 Seeds + confirm | 12 |
| Polish | 6 |
| **Total** | **115** |

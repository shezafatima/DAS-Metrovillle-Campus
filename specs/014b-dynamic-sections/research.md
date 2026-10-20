# Research: Dynamic Sections (014b)

Every unknown in the plan's Technical Context is resolved here. Each item gives a **Decision**, its **Rationale** and the **Alternatives considered**. Code references are to the tree as of 2026-10-19 (014 slice 1 in the working tree).

## R1. Store all four sections as Settings groups (the ADR candidate)

**Decision**: Syllabi, Examination, Class Levels and Portal Links become four new 005 Settings groups: `syllabi`, `examination`, `classLevels` and `portalLinks`. Each is one document in the `settings` collection, `_id` = group key. Each is edited by one 014 panel (`syllabi`, `examination`, `class-levels`, `portal-links`) and saved through the existing `savePanel` (`src/lib/settings/mutations.ts`). The four groups are added to `GROUP_KEYS` and `GROUPS` (`src/lib/settings/registry.ts`), and the panels are added to `PANELS`/`SETTINGS_TABS` (`src/lib/settings/panels.ts`).

**Rationale**: This gives the brief's "slice 1's panel pattern" for free: panel fingerprint plus group-version compare-and-set (ADR-0013), the unsaved marker and leave guard, read-only rendering, `settings_saved` with `panel`, `panelSaves`, tag revalidation plus `revalidatePath("/", "layout")`, the 60 s public cache with last-good fallback, and one shared Zod schema built from the definition (Constitution VI). Each section is one bounded document, the same as hero slides. Constitution VIII is respected: the *section* is fixed in the page layout, and admins edit the items inside it (as with hero slides and gallery albums), never which sections the page has.

**Alternatives considered**:
- **A collection per section with its own store** (the 007 gallery pattern, ADR-0005). Rejected: it would re-implement compare-and-set, conflict handling, the audit line, revalidation, the panel form and read-only mode four times. The gallery needed its own store because of Cloudinary uploads and per-album pages; nothing here does.
- **Normalised collections** (`syllabusLevels`, `syllabusTopics`, …). Rejected: the public page always reads a whole section, edits are whole-section saves, and conflicts are per section. Rows would need multi-document transactions, which the project does not assume (005 research).
- **Content files** (no database). Rejected: the brief makes these admin-managed (Constitution VIII: client-edited content lives in the database).

## R2. Engine additions (small and generic)

The 005 field engine (`src/lib/settings/types.ts`, `schema.ts`, `field-control.tsx`) gains:

| Addition | Used by | Behaviour |
|---|---|---|
| Field type `lines` (`maxItems`, `maxLength`) | syllabus group topics | Stored as `string[]`. Edited as one textarea, one entry per line. The schema accepts a string or an array, splits on newlines, trims, drops blank lines, then checks counts and lengths. Errors name the line ("Line 12 is longer than 200 characters"). |
| Field type `dayMonth` | Class Levels reference date | Stored as `"MM-DD"`. Valid if the day exists in that month in a leap year (so `02-29` passes and `04-31` fails). The control is two native selects, Day and Month. |
| `UrlField.rejectCredentials` | portal link URL | Refuses `user:pass@` (the URL's `username`/`password` is non-empty). |
| `UrlField.warnInsecure` | portal link URL | The control shows "Visitors' browsers will mark this site as not secure." when the trimmed value starts with `http://` (case-insensitive). It is a warning only; the schema accepts it. |
| `UrlField.testLink` | portal link URL | The control shows a "Test link" anchor (`target="_blank" rel="noopener noreferrer"`), enabled only while the value passes the field schema. It never touches form state. |
| `GroupRule { kind: "maxTotalLines"; path; max; message }` | syllabi | Counts entries of a `lines` field through nested lists (`levels.subjects.groups.topics`) and refuses more than `max` (3,000). |
| `ListField.maxDeletedRetained` | syllabus `levels` | Overrides `MAX_DELETED_RETAINED` (500) for one list. Syllabus levels keep 10 deleted levels. |

`isAllowedUrl` already refuses `javascript:`, `data:`, relative, scheme-less and malformed values, because it requires `^https?://` and a host. It also lower-cases the scheme through `new URL`. Its accepted set is unchanged for the existing contact/social fields. The new options are opt-in.

**Rationale**: Each addition is a small extension of an existing switch, and becomes a reusable field type (Constitution IX/X). Without `lines`, the brief's `topics: string[]` would need a list of `{id, text}` items, which is heavier to store and gives a worse editor.

**Alternatives**: Store topics as one newline-joined string. Rejected: the brief's data shape is an array, and a future consumer (the chatbot, Constitution X) should not have to re-parse it.

## R3. Removing items: a normal save plus a durable change record

**Decision**: Removing an item at any depth (a syllabus level, subject or group; an examination block; a class level; a portal link) is part of a normal panel save. There is no separate permanent-delete action (spec FR-007).
- **Top-level items** keep the engine's existing behaviour: `reconcileGroupValue` marks a removed item `deletedAt` inside the stored record (syllabus levels: at most 10 retained, `maxDeletedRetained`). Subjects and groups inside a live level are stored as sent.
- **Every removed item, at any depth,** is written to a new collection, `settingsChanges`. A pure `removedItems(def, beforeLive, afterLive)` (`lib/settings/removed-items.ts`) walks the group's list fields recursively and matches items by `id`, so reordering and editing are not removals. It returns `{ path, label, value }` for each item present before and absent after. A removed level is recorded once, with its subjects and groups inside its `value`, not once per child. `label` is a readable trail ("Class 3 · English · Reading").
- **When**: `savePanel` inserts one `SettingsChange` (`group`, `panel`, `actorEmail`, `at`, `removed`) after its compare-and-set write succeeds, and only when `removed` is non-empty. The first save of a group (nothing stored yet) writes none: what it replaces is the starting content in the code (for example the default hero slide), not something an admin removed. If the insert fails, it is retried once. If it fails again, a `settings_change_record_failed` line is logged (group, panel, count, never values) and the save still returns success. No transactions are assumed (005), so this is the trade-off: a save is never refused because the record failed, and the failure is visible in the logs.
- **Recovery**: an admin or developer re-enters the item from the record (quickstart.md runbook). This feature adds no restore button.

**Rationale**: The user's direction (2026-10-19): no separate hard delete, and removal recoverable from an audit record of the previous value. The existing `settings_saved` console line deliberately carries no field values and is kept only as long as the host keeps logs, so a durable collection is needed for recovery. Constitution VI (soft delete by default): top-level items keep the `deletedAt` marker. For nested items, the change record holds the removed item and its removal time, which serves as their soft delete outside the document.

**Alternatives**:
- **Removed values in the console log line**: no new collection, but recoverable only while the host keeps logs. Rejected.
- **Recursive `deletedAt` markers in the document**: tombstones at every depth, a heavier editor, and document growth. Rejected.
- **Writing the record before the save**: it would record removals that a lost write never made. Rejected.

## R4. Document size budget

**Decision**: Besides the brief's per-level limits, the whole syllabus is capped at **3,000 topics** (`maxTotalLines`), and at most 10 deleted levels are retained.

**Rationale**: The brief's limits multiply to 20 × 10 × 20 × 100 topics × 200 characters ≈ 80 MB, beyond MongoDB's 16 MB document limit. With 3,000 topics × 200 characters, plus headings, intros (20 × 10 × 20 × 1,500 is never reached alongside), ids and 10 retained levels, a worst case stays well under 16 MB. The full reference content is about 500 topics. The fingerprint (SHA-256 of canonical JSON) and the panel payload (well under 2 MB) stay cheap. Spec FR-015 was updated to state the cap.

**Alternatives**: Split the syllabus into one record per level. Rejected: it would break "one panel, one save, one conflict scope" and the R1 reuse.

## R5. The admission class checklist: references stored in the existing list

**Decision**: Keep the admission group's `classes` list (013) and give each item a new optional field: `{ id, name, levelId }`.
- `levelId` set means a ticked Class Level. `name` is a snapshot of the level's name, refreshed by the server on every save, and used only to name a removed level in the warning.
- `levelId` empty (`""`) means a **not linked** legacy name.

Items stored before this feature have no `levelId`, and the schema's empty-if-nil preprocess reads them as `""`. So right after deploy, before any migration, every existing class is "not linked" and still offered: the registration form is unchanged (spec Clarification 1). The list's `maxItems` stays 30, `name` max length rises from 50 to 60 (the Class Levels limit), `uniqueText` on `name` stays, and `uniqueText` on `levelId` is added (blank values are skipped by the rule already). Class Levels itself refuses duplicate names (`uniqueText`, ignoring case and repeated spaces) with a message naming the row and the reason (registration and the migration match classes by name). Syllabus level and subject names only warn in the editor.

**Offered classes** (`src/lib/registration/offered-classes.ts`, pure): the live Class Levels whose id is ticked, in Class Levels order, by their **current** name; then the not-linked names in saved order; de-duplicated ignoring case and extra spaces (first wins). `getRegistrationAvailability()` reads `admission` and `classLevels` and returns this list as `classes: string[]`, so the form, the submit route's `buildRegistrationSchema({ classes })` and `registrationOpen()` keep their contracts. A ticked id with no live level is ignored (FR-035).

**Checklist save rules** (server, in `savePanel` through a per-panel cross-check, R7):
- A NEW item (not stored yet) whose `levelId` is not a live Class Level → `conflict` (spec Clarification 2). Nothing is written. An item that is already stored whose level has since been deleted is the removed-level warning's leftover: it is dropped from the saved list, because saving acknowledges the warning (spec FR-035).
- Otherwise each linked item's `name` is replaced with the level's current name before the write.

**Removed-level warning**: on load, linked items whose level is no longer live are shown in a warning naming them ("Class 9 was removed from Class Levels and is no longer offered."), with a "Clear this warning" button that removes them from the form (marking it unsaved). Saving acknowledges the warning (FR-035). The name comes from the item's snapshot.

**Rationale**: Reusing the list keeps the 013 data, the soft-delete history and the 30-item cap, and a migration becomes "set `levelId` on matching items". Storing ids (not names) means renames flow through to the form, while registrations keep their own text (FR-034).

**Alternatives**: (a) A new `openLevelIds: string[]` field plus `unlinkedClasses: string[]`. Rejected: two fields for one list, a destructive rewrite of the 013 data, and the removed-level name would be lost. (b) Storing ticks on the Class Levels rows (`open: boolean`). Rejected: Class Levels is Pages, ticking is Settings (spec FR-032, 014 Q2). One record would mix two permissions and need field-level checks.

## R6. Class-levels migration (typed names → links)

**Decision**: `src/lib/settings/link-classes.ts` exports `planClassLinks(admission, classLevels)` (pure: each not-linked item → matched level or unmatched, comparing trimmed, space-collapsed, lower-cased names) and `linkClasses({ confirm })`. `scripts/link-classes.ts` (`npm run migrate:class-levels`, add `--confirm` to write) runs it:
- **Dry run (default)**: prints the connected database host/name (never the connection string), then "Would link: Playgroup → PlayGroup (id …)" and "Not linked: Grade 9". Writes nothing.
- **`--confirm`**: one compare-and-set write on the admission group version (re-read and re-plan on a miss, at most 3 attempts). It sets `levelId` and `name` on matched items only, and leaves unmatched items as they are. It logs `classes_linked` with counts and actor `system:014b-link-classes`, and adds `panelSaves["admission-classes"]` with `by: "system:014b-link-classes"`.
- **Idempotent**: already-linked items are skipped. A second run plans nothing and writes nothing.
- An item that would link to a level some other item already links to stays not linked and is reported ("duplicate of …"), so `uniqueText(levelId)` holds.

**Rationale**: It follows the established manual-script pattern (`grant:pages`, `migrate:gallery`). It is never run from build or startup (Constitution IV), and running it is optional for correctness (R5: not-linked names are still offered).

**Alternatives**: Auto-link on first Admission tab load. Rejected: hidden write in a read path, and the brief asks for a dry-run report.

## R7. Per-panel cross-checks in `savePanel`

**Decision**: `savePanel` gains an optional, panel-keyed async hook, `PANEL_CHECKS[panelKey]?(incoming, ctx) → { ok } | { conflict } | { invalid }`, run after the fingerprint check and before reconcile, inside the retry loop. Only `admission-classes` uses it (R5): it reads the live `classLevels` record (one `findById`) and checks and refreshes `levelId`/`name`.

**Rationale**: A small, explicit seam that keeps the panel save one code path. Registering it by panel key keeps it out of the pure, client-shared `panels.ts` (the hook needs the database).

**Race**: a level deleted between the check and the write leaves a ticked id with no live level. The public reader ignores it, and the next Admission tab load shows the removed-level warning. This is the same end state as a deletion after the save, so no transaction is needed.

## R8. "Pending client confirmation"

**Decision**: An optional top-level field on the settings document, outside `data`: `pendingConfirmation?: { source: string; seededAt: Date } | null`. It is set only by the seed scripts and is never part of the panel fingerprint, so it never causes a conflict. Ordinary saves leave it alone (`$set` lists exact paths). Two new Server Actions clear it:
- `confirmSettingsPanel({ panel })` → `await requireAdminAccess("settings")` (Portal Links).
- `confirmPagesPanel({ panel })` → `await requireAdminAccess("pages")` (Syllabi, Examination).

Each does one conditional update (`{ _id, pendingConfirmation: { $ne: null } }` → `$set: { pendingConfirmation: null }`) and is idempotent. On a real change it logs `settings_confirmed` (`group`, `panel`, actor). It refreshes the admin tab path only, since the public site is unaffected. A panel whose `saveAccess` differs from the action's → `forbidden` + `access_denied`, as with save. Class Levels has no seed, so it never shows the notice. The action still accepts it if a document were flagged.

**Rationale**: Spec Clarification 3 asks for an explicit, logged action. Keeping the flag outside `data` keeps fingerprints and the version meaningful for content only. Two actions (by permission) follow ADR-0013/R5 of slice 1, so the access inventory can prove each one.

**Alternatives**: Bump `version` on confirm. Rejected: an open editor would then conflict for a change that did not touch content.

## R9. Seed scripts

**Decision**: One runner, `scripts/seed-sections.ts` (`npm run seed:sections -- <syllabi|examination|portal-links> [--confirm]`), backed by `src/lib/settings/seed.ts`:
1. Builds the value from a typed data file (`src/content/seed/syllabi.ts`, `examination.ts`, `portal-links.ts`), adding fresh UUIDs, and validates it with the group's own schema. A data file that fails the schema is a bug and aborts.
2. Reads the stored group. If its **live** value has any content (any level, block or link), it prints "Syllabi already has content; nothing written." and exits 1, with or without `--confirm` (FR-051).
3. **Dry run (default)**: prints the database host/name, the counts (levels/subjects/groups/topics, blocks, links), every item, the adaptation report (R10) and, for Portal Links, which URLs will show the not-secure warning. Writes nothing.
4. **`--confirm`**: writes with the group-version compare-and-set (`create` when `version` 0, else a conditional update on the version, so an admin save in between makes it fail rather than overwrite). It sets `pendingConfirmation: { source: "das.edu.pk <path>", seededAt }` and `updatedBy: "system:014b-seed"`, and logs `settings_seeded` (`group`, counts). Running it twice → the second run refuses at step 2 (SC-008).

Public pages show seeded content within the 60 s cache window (spec FR-052 as updated). The script cannot call `revalidateTag` outside a running Next server.

**Rationale**: Manual only (Constitution IV), dry-run first, never overwrites. The data lives in typed files in the repo, so the "verbatim" text is reviewable in a diff before anyone runs the script. Nothing at runtime depends on das.edu.pk.

**Alternatives**: Scrape das.edu.pk when the script runs. Rejected: network dependency, the result is unreviewable, and the reference may change. Three separate scripts: same logic three times.

## R10. Seed content capture and adaptation report

**Decision**: The developer captures the reference text once from the live pages' HTML (the tab panes of `/academics/syllabi/`, the four blocks of `/academics/examinations/`, the top-bar links' `href`s for Portal Links). It goes into the typed data files with a header comment naming the source URL and capture date. Mapping rules (spec Clarification, plan session):
- A tab → a level (the tab label is the level name: "Play Group", "Nursery", "PREP", "Class 1"…"Class 8").
- An H2/H3 subject heading (ENGLISH, MATHEMATICS, SCIENCE, or "General Information", "Fee") → a subject, keeping the reference's capitalisation.
- An H4/H5 heading → its own group heading, in document order.
- A paragraph → that group's `intro` (blank line between paragraphs). A paragraph between two lists starts a heading-less group.
- A bullet or numbered item → a topic (numbering is dropped and reported).

`seed.ts` prints each adaptation recorded in the data file (`adaptations: string[]`, e.g. "Class 1 · Mathematics: numbered list 1–8 seeded as bullets"). The extracted text names some blocks "Pre-Nursery", so the developer confirms the tab → block mapping from the HTML pane ids, not from the text order, and notes it in the data file.

**Portal links capture**: labels as in the brief. URLs are the reference top bar's `href`s. Student Login is a plain `http://` IP address, kept as is, and shows the warning (FR-042, Story 6 scenario 5).

## R11. Public sections hidden when empty, and the menu

**Decision**: Add `{ id: "syllabi", label: "Syllabi" }` and `{ id: "examination", label: "Examination" }` to `pageSections.academics` after `academic-overview`, and `{ id: "class-levels", label: "Class Levels" }` to `pageSections.admission` after `admission-procedure`. A new pure module `src/lib/page-sections/dynamic.ts` exports `visibleSections(page, presence)`, which drops a dynamic section whose presence flag is false, and a server resolver `resolveDynamicSections()` that reads the three groups through `getPublicSettings` (cached, never throws) and returns `{ syllabi, examination, "class-levels" }` booleans. The **Header** (already async since 017 for About) maps the Academics and Admission children through it, the search index is built from the same items, and the two pages filter `pageSections` through it before rendering. The three always agree, as `aboutView` does for About.

Emptiness rules (FR-005, spec Edge Cases):
- Syllabi: has content when at least one level has at least one subject. Levels with no subjects are not rendered.
- Examination: at least one block. Class Levels: at least one row. Portal Links: at least one link.

**Admission's derived redirects**: `next.config.ts` builds `/admission/<id>` → `/admission#<id>` from `pageSections.admission`, so adding `class-levels` creates `/admission/class-levels` → `/admission#class-levels`. The explicit 020 rule to `/admission` is removed. `legacyAcademicsRedirects` points `/academics/syllabi` → `/academics#syllabi` and `/academics/examinations` → `/academics#examination`. When a section is empty, its anchor matches nothing and the page opens at the top (spec Assumption).

**Rationale**: It reuses the 017 pattern (the header is the one place the menu and search are built), and costs three cached reads per render.

## R12. Public Syllabi component: ARIA tabs + phone picker + per-level links

**Decision**: `SyllabiSection` (server) renders the section (`id="syllabi"`, `anchor-section`) and every level's content server-side, each in a `role="tabpanel"` with `id="syllabi-<slug>-panel"`. Non-selected panels get the `hidden` attribute, so the content is in the HTML for search engines and no-JS visitors still get the first level. A small client island, `SyllabiTabs`:
- **md and up**: a `role="tablist"` row of `role="tab"` buttons (`aria-selected`, `aria-controls`, roving `tabindex`). Left/Right wrap, Home/End jump, and selection follows focus (automatic activation, which suits a few short panels). Overflow scrolls inside the tablist (`overflow-x-auto`), never the page.
- **below md**: a labelled native `<select>` ("Choose a class") in place of the tab row (CSS `hidden md:flex` / `md:hidden`, so only one is in the accessibility tree).
- **Hash sync**: on mount and on `hashchange`, `#syllabi` → the first level, `#syllabi-<slug>` → that level (else the first), then the section is scrolled into view. Choosing a level calls `history.replaceState(null, "", "#syllabi-<slug>")`, so no history entry is added (spec Clarification 4).
- **Slugs** come from `levelSlug(name)` (pure, `src/lib/syllabi/slug.ts`): NFKD, ASCII letters and digits, others → `-`, trimmed. Empty → `level-<n>`. Repeats get `-2`, `-3`, … in level order. They are computed once on the server and passed to the island.
- **Content**: subject `h3`, group heading `h4`, intro paragraphs `p`, topics `ul > li`. Plain text only (React escapes everything, and nothing uses `dangerouslySetInnerHTML`).

**Rationale**: The WAI-ARIA APG tabs pattern meets the brief and spec FR-017. Server-rendering all panels keeps the JS small (Constitution IX) and the content indexable.

## R13. Public Examination and Class Levels components

- `ExaminationSection` (server): `id="examination"`, cards in `grid gap-… md:grid-cols-2`, each `article` with an `h3` heading and paragraphs split on blank lines (`/\n\s*\n/`), with single newlines kept as spaces. Recorded deviation: cards instead of the reference's stacked blocks (spec Deviations).
- `ClassLevelsSection` (server): `id="class-levels"`. **md and up**: a `<table>` with `<caption class="sr-only">`, `<th scope="col">Class level</th><th scope="col">Age on 31 July</th>` and a row per level. **Below md**: a `<dl>` per level (term "Class level"/value, term "Age on …"/value), with the table hidden (`hidden md:table`) and the list hidden at md (`md:hidden`), so assistive technology meets one of them. The header text is `formatDayMonth("07-31")` → "31 July" (English month names from a fixed array, no locale dependence).
- Tokens: existing section, card and table classes from earlier sections (`AboutSection` wrapper, card surface and border tokens). Any missing value is added to `research/design-tokens.md` first (Constitution VII).

## R14. Footer Portal Links and `/portal` retirement

**Decision**:
- `PublicShell` reads `getPublicSettings("portalLinks")` beside the contact read and passes `portalLinks` to `Footer`.
- The column renders only when there is at least one link. The grid becomes `lg:grid-cols-4` with links and `lg:grid-cols-3` without (`md:grid-cols-2` either way), so the remaining columns reflow (FR-045).
- Each link is `<a href target="_blank" rel="noopener noreferrer">`, with the label plus `<span className="sr-only"> (opens external site in a new tab)</span>` and an `ExternalLink` icon (`aria-hidden`). It is a plain `<a>`, not `next/link`, since every target is external.
- `src/app/(public)/portal/[slug]/` is deleted. `next.config.ts` adds `{ source: "/portal/:path*", destination: "/", permanent: true }` (and `/portal` itself). The `portalLinks` constant and its comment are removed from `src/content/site-shell.ts`, along with its test cases.
- **Other `/portal/` links**: none in app code (spec Findings). `e2e/page-sections.spec.ts` lines 88 and 99 are rewritten: the footer walk asserts there is no `/portal/` href, and the `/portal/lms-app` visit asserts a redirect to `/`. A test (`src/content/no-portal-links.test.ts`) greps `src/` for `"/portal/"` hrefs, so none can come back.

**Public shape** `PublicPortalLink { id; label; url; insecure: boolean }`. `insecure` is not shown publicly but is used by the admin preview.

## R15. Admin pages and panels

- **Academics tab** (new): `src/app/admin/(dashboard)/settings/academics/page.tsx`, `await requireAdminPage("pages")`, panels `syllabi`, `examination`. `SETTINGS_TABS` academics becomes `["syllabi", "examination"]`, so the tab now shows.
- **Admission tab**: panels become `admission-window`, `admission-messages`, `class-levels`, `admission-classes` (public page order: the class table sits between the procedure and the registration form). The page reads `classLevels` too, for the checklist.
- **Site-wide tab**: `contact`, `portal-links`.
- **Custom editors**: `SettingsPanelForm` gains an `editor` prop (from the panel registry: `editor?: "syllabus" | "classes-checklist"`). When set, it renders that component instead of the generic field list, with the same `value`/`onChange`/`errors`/`clearError` and the same save path. Examination, Class Levels and Portal Links use the generic `ListEditor` (cards, inline fields, up/down, delete confirmation, add panel).
- **SyllabusEditor**: a level list with up/down/rename/remove. Only one level is expanded at a time (an accordion keyed by level id). Inside it are subjects (same controls) and groups (heading, intro, topics textarea using `lines`). Removing a level or subject opens the existing `AlertDialog` with "This removes N topics." Level, subject and group bodies are memoised (`React.memo`, keyed by id), and topic textareas keep local text, committing on change without re-rendering other levels. That keeps typing responsive with the full content (SC-002). A "Preview" link goes to `/academics#syllabi`.
- **ClassesChecklist**: one checkbox per live Class Level (label = name), the not-linked list (each with a "Link to" select of unticked levels and "Remove"), and the removed-level warning (R5). Read-only users see the same inside `<fieldset disabled>` (slice 1 R11).
- **Pending notice**: `getAdminPanels` returns `pending: { source, seededAt } | null`. `SettingsPanel` shows a notice ("Copied from the reference site on … Awaiting client confirmation.") with a "Mark as confirmed by client" button (an `AlertDialog` confirm, then the action for the panel's permission). Read-only users see the notice without the button.

## R16. Access, logging, revalidation

- **Saves**: `saveSettingsPanel` now also accepts `portal-links`, and `savePagesPanel` accepts `syllabi`, `examination` and `class-levels` (by each panel's `saveAccess`, unchanged logic). The order of checks stays as in slice 1's contract.
- **New actions**: `confirmSettingsPanel` and `confirmPagesPanel` in the same file. The inventory entry becomes `perAccess: { settings: 2, pages: 2 }`.
- **New page**: `settings/academics/page.tsx` → `{ kind: "page", access: "pages" }`.
- **Log events** (`src/lib/log.ts`): `settings_confirmed`, `settings_seeded` and `classes_linked` (fields: `group`, `panel`, counts, never content).
- **Revalidation**: unchanged for saves (`SETTINGS_TAG`, the group tag, `revalidatePath("/", "layout")`), which covers `/academics`, `/admission`, the footer on every page and the registration form. The Admission and registration pages are already per-request (`connection()`), and `/academics` follows the public layout's 60 s window plus the tags.

## R17. Tests (Constitution XI)

- **Unit (Vitest)**:
  - **Engine additions**: `lines` parsing (trim, blanks, counts, per-line errors); `dayMonth` (02-29 yes, 04-31 no); URL credentials, schemes, `javascript:`/`data:`/relative/`www.`/`https//broken` refused; `maxTotalLines`; `maxDeletedRetained`.
  - **Group definitions**: each new group's limits.
  - **Registry invariants**: the existing panels test extended.
  - **Pure helpers**: `offeredClasses`, `planClassLinks`, `levelSlug`, `visibleSections`, `formatDayMonth`, paragraph splitting.
  - **`savePanel`**: checklist cross-check (conflict on a deleted level, name refresh); a syllabi save at full reference size.
  - **Confirm**: idempotent, logs once, forbidden on the wrong action.
  - **Seed**: refuses on existing content, dry run writes nothing, `--confirm` sets pending, second run refuses.
  - **Migration**: dry run, confirm, idempotent, duplicates.
  - **Access**: inventory rows; actions' three access cases.
  - **013 tests updated**: availability, the registration route schema, the admission panel.
- **Change record**: `removedItems` (a nested removal is found once, with its children; reordering or editing is not a removal); `savePanel` writes one `SettingsChange` only when something was removed, retries once, and logs `settings_change_record_failed` without failing the save.
- **E2E (Playwright + axe)**: one spec per user story (portal links/footer/redirects; class levels + checklist + registration; migration display; syllabi editor + public tabs/keyboard/hash; examination; seed notice + confirm). Also: access-matrix rows for the Academics tab, axe on the four panels and on `/academics`, `/admission` and a footer page, and layout checks at 375/640/768/1024/1440 (640 = the reference theme's mobile-menu breakpoint; no overlapping boxes; no horizontal scroll, table vs stacked list, 1 vs 2 card columns, footer 3 vs 4 columns). The 013 E2E specs are moved to ticking Class Levels.
- **Performance check (SC-002)**: an E2E that seeds the full reference syllabus, opens a level, types into a topics box and saves, asserting the save round-trip is under 2 s and logging the measured time (the 1 s target is checked by hand on a production build) and checking no long task over 200 ms while typing (Performance API `longtask`).

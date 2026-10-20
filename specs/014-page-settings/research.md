# Research: Settings by Page (014, slice 1)

Every unknown in the plan's Technical Context is resolved here. Each item: **Decision**, **Rationale**, **Alternatives considered**.

## R1. One folder per tab, not a dynamic `[tab]` segment

**Decision**: Static route folders `settings/site-wide`, `settings/home`, `settings/admission`, `settings/resources` (plus `settings/resources/gallery/[albumId]`). About, Academics and Careers get no folder in this slice, so their URLs are Next's not-found page (FR-003). The URL pattern is still `/admin/settings/<tab>`, as the brief asks.

**Rationale**: The access inventory (`src/test/access-inventory.test.ts`) checks each page file for exactly one `await requireAdminPage("<literal>")`. One file per tab keeps that check literal, so each tab's permission is visible in its own file and in the inventory. Tabs have different bodies anyway (Admission computes a status line, Resources embeds the album list), so a shared `[tab]/page.tsx` would be a switch statement.

**Alternatives**: `settings/[tab]/page.tsx` with `generateStaticParams` and a lookup table. Rejected: the access literal would come from a table, and the inventory test would need a special case for a page whose access varies by parameter.

## R2. "Settings or Pages" as one named access value

**Decision**: Add `"settings_or_pages"` to the `Access` union in `src/lib/permissions.ts`; `canAccess` grants it when the user holds either key (main admin: always). It is used by the Admission tab page, the `/admin/settings` redirect page and the sidebar's Settings item.

**Rationale**: The inventory test and the DAL take one string literal. A named value keeps both unchanged and keeps the rule in the one registry of who may use what (011). It is not a grantable key, so the Users panel and stored grants are untouched (011 FR-005 holds: no new key, no change to grant/storage).

**Alternatives**: (a) `Access` accepting an array (`["settings","pages"]`): more general, but every literal-matching test and the `access_denied` log's `access` field would need to handle arrays; no second use exists (Constitution X: not speculative). (b) `requireAdminPage("any")` then a hand check in the page: hides the rule from the inventory.

## R3. Panels: a pure registry over existing groups

**Decision**: A new pure module `src/lib/settings/panels.ts` defines tabs (key, label, view access, ordered panel keys) and panels (key, title, admin anchor, "View on site" href, save access, and either `{ kind: "group", group, fields }` or `{ kind: "gallery" }`). A panel's `fields` is the full field list of its group, except the admission group's three panels, which list their own keys. `panelDefinition(panel)` derives a `GroupDefinition` holding only the panel's fields and only the group rules whose fields are all in the panel (the `dateOrder` rule lives entirely in the Admission window panel). Client and server both use it (Constitution VI: one schema).

**Rationale**: The 005 engine already renders and validates a `GroupDefinition`; a panel is a filtered definition, so the form, field controls and Zod schema are reused with no per-panel code. No stored record changes (FR-009).

**Alternatives**: Splitting the `admission` group into three stored groups. Rejected: the brief forbids a data migration, and 013's registration reader and the 020 window reader read one record.

## R4. Partial saves with a per-panel fingerprint (the ADR candidate)

**Decision**: A panel save sends `{ panel, expectedFingerprint, data }`. The server:

1. Parses `data` with the panel's definition. Keys outside the panel are dropped by the schema (Zod strips unknown keys, as for groups today), so they can never reach storage.
2. Reads the stored group (version `v`), merges defaults, takes its live value, and computes the panel fingerprint: SHA-256 (hex, first 16 bytes) of a canonical JSON (sorted keys) of the panel's fields only.
3. If that fingerprint differs from `expectedFingerprint` → `conflict` ("changed by someone else, reload").
4. Builds the next whole-group value: stored live value with the panel's fields replaced; validates it with the full group schema; reconciles list items (soft delete) and verifies new images exactly as `saveGroup` does.
5. Writes with the existing compare-and-set on the group version (`findOneAndUpdate({ _id, version: v })`, or `create` when `v = 0`). If the write misses because another panel of the same group was saved in between, go back to step 2, at most 3 attempts; then `conflict`.
6. Returns the panel's new fingerprint and live fields, the group version, and the save time and editor.

The fingerprint is sent to the client with the panel's initial data and replaced after each successful save.

**Client side.** A panel form is keyed on its panel key only, never on the group version or fingerprint. After any save, the page refresh brings new `initial` props, but a mounted form ignores them: it keeps its own edits, fingerprint and saved baseline. After its own save, a form takes the returned data and fingerprint. A sibling keeps its original fingerprint, which is still valid because its fields didn't change (step 3). (Today's `settings-group-view.tsx` keys the form on `initial.version`, which would remount a sibling and lose its edits.)

**Rationale**:
- **Same panel, two admins** → the second save's fingerprint no longer matches → refused (the brief's rule; ADR-0005 compare-and-set semantics).
- **Sibling panels** (Admission window and Admission messages) → each checks only its own fields, so an admin's own save of one never makes the other stale (FR-012), and another admin's save of a sibling panel is kept, not overwritten (FR-010).
- **Atomicity** stays with the group version: the stored record is only ever written whole by one conditional update, so two concurrent sibling saves serialize and neither is lost. No transactions are assumed (005 research).
- For a one-panel group the fingerprint covers every field, which is equivalent to today's version check.

**Alternatives considered**:
- **Keep the group version as the only check, and have the client pass the new version to sibling panels after its own save.** Rejected: if another admin changed panel B between B's load and A's save, B silently adopts a version that includes that change, and B's next save overwrites it (exactly the silent overwrite the brief forbids).
- **Refuse any save when the group version moved** (strict group CAS). Rejected: breaks FR-012 (an admin's own save of one panel would block the next) and gives false conflicts between unrelated panels.
- **Client sends the full original panel values instead of a fingerprint.** Same semantics, bigger payload, and the server would compare untrusted structures; a fingerprint is computed on the server only from stored data.
- **Per-panel version counters stored on the record.** Rejected: changes the stored shape (a migration) for no gain over a fingerprint derived from data already stored.

A client can bypass the conflict check only by sending a fingerprint it computed from the current stored values, i.e. after seeing them; that harms no one but that admin and needs the panel's save permission anyway.

## R5. Two save actions, one per permission

**Decision**: Replace `saveSettingsGroup` with two Server Actions in `settings/actions.ts`:
- `saveSettingsPanel` → `await requireAdminAccess("settings")`; accepts only panels whose save access is `settings` (Contact & social, Admission window, Classes open for admission).
- `savePagesPanel` → `await requireAdminAccess("pages")`; accepts only panels whose save access is `pages` (Hero, Why Choose video, Progress dashboard, Admission messages).

A panel sent to the wrong action is refused as `forbidden` and logged as `access_denied` (with the panel's key), after the session check. An unknown panel key is `invalid`. The gallery actions keep their own file and move to `requireAdminAccess("pages")`.

**Rationale**: The inventory test supports a file whose actions ask for different literals (`perAccess`), so each action's permission stays a literal the test checks. Removing `saveSettingsGroup` closes the old path by which a Settings-only user could save hero, stats or video.

**Alternatives**: One action that looks up the panel and then calls `requireAdminAccess(panel.saveAccess)`. Rejected: the access would be a variable, invisible to the inventory test; the matrix could not prove which permission each save needs.

## R6. Forbidden outcome for tab pages

**Decision**: Tab pages use `requireAdminPage(...)`, so a signed-in user without the permission is logged (`access_denied`) and redirected to `/admin?denied=1`. This is the 011 forbidden outcome for every admin page; routes and actions return `forbidden` (403).

**Rationale**: Consistent with all existing admin pages and with 011's access matrix. Next's `forbidden()` needs the experimental `authInterrupts` flag (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md`); turning on an experimental flag for one area is not worth it, and 011 already defines what "forbidden" means for a page.

**Alternatives**: `forbidden()` with a `forbidden.tsx`; `requireAdminPageOr404` (013 pattern). Rejected: the tabs' existence is not secret (unlike registrations), and the overview's "denied" notice already explains the refusal.

## R7. Old URLs: `next.config.ts` redirects

**Decision**: Permanent redirects in `next.config.ts`, next to the public-page redirects:

| Source | Destination |
|---|---|
| `/admin/settings/contact` | `/admin/settings/site-wide#contact` |
| `/admin/settings/hero` | `/admin/settings/home#hero` |
| `/admin/settings/video` | `/admin/settings/home#video` |
| `/admin/settings/stats` | `/admin/settings/home#stats` |
| `/admin/settings/gallery` | `/admin/settings/resources#photo-gallery` |
| `/admin/settings/gallery/:albumId` | `/admin/settings/resources/gallery/:albumId` |

`/admin/settings/admission` is both the old and the new URL, so it needs no redirect. The old page folders are deleted.

**Rationale**: Config redirects run before the proxy and the page, and reveal only a fixed URL mapping; the destination page then applies its own access check (spec US3 scenario 3). The site already redirects to fragments this way (`/hifz-e-quran` → `/academics#hifz-e-quran`).

**Alternatives**: Keep the old page files as `redirect()` stubs. Rejected: each stub is another entry point in the access inventory, and a stub that redirected before checking access would leak nothing but would still need tests.

## R8. One unsaved-changes guard per tab

**Decision**: A client `UnsavedPanelsProvider` wraps each tab's panels. Each panel reports `(panelKey, dirty)`; the provider calls the existing `useUnsavedChanges(anyDirty, settingsCopy.unsavedPrompt)` once. The panel form no longer calls the hook itself.

**Rationale**: `useUnsavedChanges` installs a capture-phase click listener; one per dirty panel would show the confirm dialog once per panel. One provider gives one prompt for any number of unsaved panels and covers tab links, sidebar links, "View on site" links, reload and close (FR-025).

**Alternatives**: Keep per-form hooks and de-duplicate with a module-level flag. Rejected: hidden shared state, harder to test.

## R9. Collapsible panels: the disclosure pattern with a sticky header row

**Decision**: Each panel is a `<section id="<anchor>">` with a header row and a body. The header row holds an `h2` wrapping a `<button aria-expanded aria-controls>` (the toggle), the "Unsaved changes" badge and the "View on site" link, and is `position: sticky` under the admin top bar, so it stays visible while any part of the panel is on screen (FR-024). The body is hidden with the `hidden` attribute when collapsed, so it stays mounted and edits survive collapsing. A small client effect opens the panel named by `location.hash` on load and on `hashchange`, then scrolls it into view. Panels start expanded.

**Rationale**: The WAI-ARIA disclosure pattern is keyboard operable (a real button) and exposes the state with one attribute. Only the header row is sticky, never the whole panel. The link sits beside the button, not inside it, so there is no nested interactive control. No Accordion primitive exists in `src/components/ui`, and one panel component is all that is needed (Constitution IX).

**Alternatives**: Native `<details>`/`<summary>`: a sticky `<summary>` is unreliable across browsers, and the link would have to be inside the summary (nested interactive) or hidden when collapsed. A Base UI Collapsible: more client code for the same behaviour; it can be swapped in later behind the panel component.

## R10. Tab bar: links with `aria-current`, single scrolling row

**Decision**: Rework `SettingsNav` into the tab bar: a `<nav aria-label>` with links (one per visible tab), `flex-nowrap overflow-x-auto`, active link `aria-current="page"` and scrolled into view on mount (`scrollIntoView({ inline: "nearest", block: "nearest" })`). The server layout passes the list of visible tabs (computed with `canAccess`), as the dashboard layout does for the sidebar.

**Rationale**: Each tab is its own page and URL, so this is site navigation, not the ARIA tabs widget (which is for panels switched in place). Links also let the unsaved-changes guard intercept tab changes.

**Alternatives**: ARIA `tablist`. Rejected: wrong semantics for page navigation, and arrow-key roving focus would fight the link guard.

## R11. Read-only panels

**Decision**: A panel the user may view but not save renders the same form inside `<fieldset disabled>`, with no Save button, and a line "You need the Settings permission to change this." (copy in `src/content/admin.ts`). The values come from the same server read as for an editor.

**Rationale**: A disabled fieldset disables every native control, including list-editor buttons, with no per-control changes, and is announced as disabled. Server-side, the save action refuses anyway (R5).

## R12. Home section anchors

**Decision**: Add `id="hero"` to the hero slider's section, `id="why-choose"` to the Why Choose block and `id="progress-dashboard"` to the dashboard section, each with the existing `anchor-section` class for scroll offset. No other public change (FR-005).

**Rationale**: "View on site" links need fragment targets; ids are unused today (only test ids exist).

## R13. Logging

**Decision**: `settings_saved` gains `panel` (the panel key, e.g. `admission-messages`) alongside `group`; the `SecurityEvent` type gets an optional `panel` field. The settings record also gets an additive `panelSaves` map (`{ [panelKey]: { by, at } }`) so each panel's "Last saved by … on …" line shows that panel's own last save; a record without it falls back to the group's `updatedBy`/`updatedAt`. Gallery logging (`gallery_changed`) is unchanged.

**Rationale**: FR-013 needs who, which panel, when. Without `panelSaves`, the Admission messages panel would claim a last save that was really the window's.

**Alternatives**: No per-panel line (show only the group's). Rejected: misleading on the Admission tab. A separate audit collection: out of scope (brief: no versioning beyond the log).

## R14. The one-time Pages grant

**Decision**: `src/lib/users/grant-pages.ts` exports `grantPagesToSettingsHolders()`, run by `scripts/grant-pages.ts` (`npm run grant:pages`). For each non-deleted user with role `content_manager` whose `permissions` contains `settings`, it runs one conditional update on the Better Auth `user` collection: `updateOne({ _id, deletedAt: null, permissions: { $ne: "pages" } }, { $addToSet: { permissions: "pages" } })`. Only when `modifiedCount === 1` does it append a `permissions_changed` entry (`details: { added: ["pages"], removed: [] }`) with actor `system` / `system:014-grant-pages`, and a `user_access_changed` log line. It prints how many accounts were changed. Disabled accounts are included, so re-enabling them restores their previous reach. Main admins are skipped (their stored grants are irrelevant).

**Rationale**: The conditional update is atomic and is its own idempotency check: a second run (or a grant the main admin already made by hand) matches nothing, so nothing is written or logged (Q3). Pages is unused by the current code, so running the grant **before** deploying the move changes nobody's access today and leaves no window where a Settings holder has lost anything (FR-022a). It is a manual release step like `migrate:gallery`, never run from build or startup (Constitution IV).

`--dry-run` runs the same query and lists the accounts that match (email and current permissions) without any update or change-record entry. Both modes first print the connected database host and name, taken from the Mongoose connection (never the connection string or a password), so the operator can confirm they're on production.

**Alternatives**: Grant lazily on login or on first Settings visit. Rejected: spreads a one-time migration through hot paths and makes "who changed this" harder to read. Route it through `updateUserAccess`: rejected, because that needs a main-admin actor and replaces the whole grant list (a race with a concurrent manual edit could drop a grant).

## R15. Tests needed (Constitution XI)

- **Unit (Vitest)**: panel registry invariants (every group field in exactly one panel; tab order; anchors unique); `panelDefinition` rule filtering; fingerprint stability; `savePanel` (partial merge, extra keys dropped, same-panel conflict, sibling saves without conflict, concurrent sibling retry, images, defaults on first save); both actions' three access cases plus wrong-action `forbidden`+log; `canAccess("settings_or_pages")`; grant (idempotent, skips main admins, deleted users and holders of Pages, writes one change entry each); access inventory rows.
- **E2E (Playwright)**: tabs and order (US1), per-permission tab bars, read-only panels, and forbidden URLs (US2), old-URL redirects (US3), two-panel unsaved flow and leave warning (US4), 320 px tab bar (US5), axe on each tab per permission view. Existing settings and gallery specs move to the new URLs.

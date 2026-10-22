# ADR-0014: Dynamic Sections as Settings Groups, with the Admission Checklist as Level References

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Proposed
- **Date:** 2026-10-19
- **Feature:** 014b-dynamic-sections (replaces 014 "slice 2", plus footer portal links)
- **Context:** Four public parts become admin-managed: Syllabi and Examination (`/academics`), Class Levels (`/admission`) and the footer's Portal Links. The brief requires each to be a panel with slice 1's behaviour:
  - its own save, compare-and-set conflict refusal, an unsaved-changes marker, an audit entry and public revalidation;
  - a shared client/server Zod schema with length limits;
  - server-side permission checks (Pages for the first three, Settings for Portal Links).

  Two further requirements shape the storage:
  1. **Class Levels must feed registration.** "Classes open for admission" (013, Settings permission) becomes a checklist of Class Levels rows. Renames must flow through to the form, past registrations must keep their stored text, and existing typed names must never be silently dropped (spec Clarifications 1 and 2: unmatched names stay offered until resolved, and a save naming a level deleted after load is refused as a conflict).
  2. **Seeded content is "pending client confirmation"** until an explicit, logged action clears it, and ordinary saves don't clear it (spec Clarification 3).

  The syllabus is the largest shape: levels → subjects → groups (heading, optional intro, topics). The brief's per-level limits multiply to about 80 MB, beyond MongoDB's 16 MB document limit. Transactions are not assumed (005). Slice 1 already provides a panel registry over Settings groups, with per-panel fingerprints and group-version compare-and-set (ADR-0013).

<!-- Significance checklist
     1) Impact: yes. It fixes how every remaining admin-managed section is stored, saved and read, and how registration's class list is derived.
     2) Alternatives: yes. Own stores per section (ADR-0005 pattern), normalised collections, content files, and two different checklist models were viable.
     3) Scope: yes. It spans the settings engine (field types, schema, reconcile), the panel registry and save path, Server Actions, the public readers, header/menu/search, footer, registration availability, two manual scripts and the access inventory. -->

## Decision

One integrated cluster.

**1. Storage: each section is a 005 Settings group edited by one 014 panel.**
- New groups `syllabi`, `examination`, `classLevels` and `portalLinks`, each one document in `settings` (`_id` = group key).
- New panels `syllabi` and `examination` (Academics tab, Pages), `class-levels` (Admission tab, Pages) and `portal-links` (Site-wide tab, Settings).
- Saved by the existing `savePanel`: panel fingerprint check, then group-version compare-and-set with at most 3 attempts. Read publicly by `getPublicSettings` (60 s cache, tags, last-good fallback). Revalidated as in slice 1.
- Each save action accepts the panels matching its permission (ADR-0013).

**2. Engine extensions instead of bespoke schemas.** Each is opt-in and reusable:
- a `lines` field (`string[]` edited as one textarea; trims and drops blank lines);
- a `dayMonth` field (`"MM-DD"`, leap-year valid);
- URL options `rejectCredentials`, `warnInsecure` and `testLink` (http/https with a host was already enforced);
- a group rule `maxTotalLines`;
- a per-list `maxDeletedRetained`.

**3. Size budget.** The whole syllabus is capped at 3,000 topics, and at most 10 deleted levels are retained, so one document always fits under 16 MB (spec FR-015 updated).

**4. Removing is a normal save, recorded durably.** There is no permanent-delete action. A removed top-level item (syllabus level, block, class level, link) keeps the engine's `deletedAt` marker in the record. Every removed item at any depth is also written, with its full previous value, to a new `settingsChanges` collection after the save succeeds (retried once; a failure is logged and never fails the save), so a wrong removal can be re-entered. Removing a level, subject, or a group with content asks for confirmation first.

**5. Custom editors plug into the one panel form.** The panel registry gains `editor?: "syllabus" | "classes-checklist"`. `SettingsPanelForm` renders that component in place of the generic field list, with the same state, schema, save and read-only paths. Examination, Class Levels and Portal Links use the generic list editor.

**6. The admission checklist stores level references in the existing `classes` list.**
- Each item becomes `{ id, name, levelId }`. A non-empty `levelId` means a ticked Class Level, and `name` is a server-refreshed snapshot used only to name a removed level. An empty `levelId` means a **not linked** legacy name.
- Items stored before this feature read as not linked, so deploying changes nothing for parents.
- **Offered classes**: the ticked live levels in Class Levels order, under their current names, then the not-linked names, de-duplicated. `getRegistrationAvailability()` computes them, so the form, the submit route and `registrationOpen()` keep their contracts. Registrations still store the class as text.
- **Cross-check**: `savePanel` gains a per-panel hook, used only by `admission-classes`. It refuses (`conflict`) any `levelId` that is not a live Class Level, and refreshes the snapshots.
- **Migration**: an optional, idempotent manual migration (`migrate:class-levels`, dry run by default, `--confirm` to write) links typed names by case- and space-insensitive match, and reports unmatched names and duplicates.

**7. "Pending client confirmation" lives outside the content.** `pendingConfirmation: { source, seededAt } | null` is a top-level field of the settings document, not in `data`, so it is in no fingerprint and never bumps `version`.
- It is set only by `seed:sections --confirm`. That script reads from reviewed, typed data files in the repo, is a dry run by default, refuses if the section has any live content, and writes with compare-and-set.
- It is cleared only by `confirmSettingsPanel` / `confirmPagesPanel` (one action per permission, a conditional update, idempotent, logs `settings_confirmed`).

**8. Empty sections are hidden in one place.** The three sections are added to `pageSections`. One resolver (`resolveDynamicSections` + `visibleSections`), fed by the cached Settings reads, decides visibility for the page, the header dropdown and the search index, following the 017 About pattern. The footer column renders only when links exist.

## Consequences

### Positive

- **Reuse**: conflict handling, audit, revalidation, read-only mode, the leave guard and the access-inventory proof are reused rather than rebuilt four times. A new section costs a group definition, a panel entry and (only if needed) an editor.
- **One stored document per section**: the conflict scope, the save unit and the public read all coincide with what admins and visitors think of as "the section".
- **Safe deploy for registration**: the change is a no-op for parents until someone ticks levels or runs the migration. Renames propagate, and history is never rewritten.
- **Confirming is invisible to editors**: confirming never conflicts with an open editor and never touches content or its version.
- **Reusable field types**: the new types and options are available to slice 3 (page text) and later features.
- **Consistent visibility**: the page, menu and search can't disagree about which sections exist.

### Negative

- **Size limits**: a whole section is rewritten on every save, and the syllabus can be ~1–2 MB at its cap. That is acceptable at this admin scale (2–5 users), but it rules out very large future syllabi without splitting the record.
- **Coarse conflict scope**: two admins editing different syllabus levels at the same time conflict, because the panel fingerprint covers the whole syllabus.
- **Recovery is manual, and has a small gap**: recovery means re-entering the item from the change record (no restore button). Because the record is written after the save without a transaction, a record that fails twice is lost, and only a log line shows it.
- **A new collection** (`settingsChanges`) to index, retain and document.
- **One cross-group dependency**: the checklist panel depends on another group's live ids, enforced by a server hook rather than a database constraint. A level deleted between the check and the write leaves a dangling id, which readers ignore and the Admission tab then warns about.
- **The `classes` list now has three item states** (ticked, not linked, removed), which the editor, the reader and the tests must all handle.
- **The engine grows**: two field types, three URL options, a group rule and a list option, each needing tests and a control.
- **Hiding empty sections costs reads**: three more cached Settings reads per public render (header), plus one for the footer.

## Alternatives Considered

- **A store per section (the ADR-0005 gallery pattern)**: a collection or single document per section, with its own compare-and-set, actions and editor. Rejected: it duplicates slice 1's save, conflict, audit, revalidation and read-only machinery four times. The gallery needed its own store for Cloudinary uploads and per-album pages, and nothing here does.
- **Normalised collections** (`syllabusLevels`, `syllabusTopics`, `classLevels` rows): finer-grained conflicts and no document-size ceiling. Rejected: every public read and every admin save is a whole section, and consistent multi-row saves would need transactions, which the project does not assume.
- **Content files only**: rejected. The brief makes these admin-managed, and Constitution VIII puts client-edited content in the database.
- **One record per syllabus level**: removes the size ceiling and the cross-level conflicts, but breaks "one panel, one save, one conflict scope" and the R1 reuse. Rejected for now; it is the migration path if the 3,000-topic cap is ever reached.
- **Checklist as separate fields** (`openLevelIds: string[]` + `unlinkedClasses: string[]`): a cleaner shape, but a destructive rewrite of 013's data that loses soft-delete history and the names needed for the removed-level warning.
- **Checklist as an `open` flag on Class Levels rows**: puts a Settings-permission decision into a Pages-permission record, needing field-level permission checks inside one panel. Rejected (014 Q2).
- **Pending flag inside `data`, or bumping `version` on confirm**: either makes an open editor conflict on a change that touched no content. Rejected.
- **Recursive soft delete for nested lists**: tombstones at every depth, a heavier editor, and document growth. Rejected in favour of the change record.
- **Removed values only in the console log line**: no new collection, but recoverable only while the host keeps logs. Rejected.

## References

- Feature Spec: [specs/014b-dynamic-sections/spec.md](../../specs/014b-dynamic-sections/spec.md)
- Implementation Plan: [specs/014b-dynamic-sections/plan.md](../../specs/014b-dynamic-sections/plan.md) (Key Design Points 1–5)
- Research: [specs/014b-dynamic-sections/research.md](../../specs/014b-dynamic-sections/research.md) (R1–R9, R11, R15)
- Data model and contracts: [data-model.md](../../specs/014b-dynamic-sections/data-model.md), [contracts/panel-actions.md](../../specs/014b-dynamic-sections/contracts/panel-actions.md), [contracts/scripts.md](../../specs/014b-dynamic-sections/contracts/scripts.md), [contracts/public-sections.md](../../specs/014b-dynamic-sections/contracts/public-sections.md)
- Related ADRs:
  - ADR-0013 (panels, fingerprints, one save action per permission): extended, not changed.
  - ADR-0005 (gallery single-document CAS): the alternative pattern, deliberately not used.
  - ADR-0009 (single pages with anchored sections): extended with hidden-when-empty sections.
  - ADR-0012 (registration data handling): registrations still store the class as text, so it is unchanged.
  - ADR-0011 (admission window): the open/closed rule is unchanged, fed by the new offered-classes list.
- Evaluator Evidence: [history/prompts/014b-dynamic-sections/52-adr-dynamic-sections-settings-groups.misc.prompt.md](../prompts/014b-dynamic-sections/52-adr-dynamic-sections-settings-groups.misc.prompt.md)

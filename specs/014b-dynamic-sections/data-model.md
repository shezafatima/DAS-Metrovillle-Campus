# Data Model: Dynamic Sections (014b)

One new collection (`settingsChanges`). There are four new documents in `settings` (one per new group), one additive optional field on every settings document, and one additive item field in the existing `admission` group. Tabs and panels are code (`src/lib/settings/panels.ts`).

Every list item carries the 005 envelope `{ id: uuid, deletedAt: Date | null }` in storage. Admins send and see live items only (`deletedAt` stripped). All text is plain: trimmed, length-checked, and rendered escaped.

## Settings document (`settings`, 005/014) — one additive field

| Field | Change |
|---|---|
| `_id`, `data`, `version`, `updatedBy`, `updatedAt`, `panelSaves` | unchanged |
| `pendingConfirmation` | **new, optional**: `{ source: string; seededAt: Date } \| null`. Set only by `seed:sections --confirm`, cleared only by the confirm actions. Not part of `data`, so it is not in any fingerprint and never bumps `version`. Absent ⇒ not pending |

## Group `syllabi` (panel `syllabi`, tab Academics, save: Pages)

```
data: {
  levels: Level[]                        // list, max 20, maxDeletedRetained 10 (top-level soft delete)
}
Level   { id, name: text 1–60 (required), subjects: Subject[] }        // subjects: list, max 10
Subject { id, name: text 1–60 (required), groups: Group[] }            // groups: list, max 20
Group   { id, heading: text 0–120, intro: longText 0–1500, topics: lines }
          // topics: lines, max 100 per group, each 1–200 chars
          // rule: intro non-empty OR topics.length ≥ 1
group rule maxTotalLines(levels.subjects.groups.topics) ≤ 3000
```

- Level and subject names may repeat: the editor shows an inline warning and does not block saving. Public tab slugs are de-duplicated (`-2`, `-3`).
- **Public shape** `PublicSyllabus { levels: { id; name; slug; subjects: { id; name; groups: { id; heading; paragraphs: string[]; topics: string[] }[] }[] }[] }`, with levels that have no subjects removed. `hasContent = levels.length > 0`.
- **Defaults**: `levels: []` (a never-saved group reads as empty, so the section is hidden).

## Group `examination` (panel `examination`, tab Academics, save: Pages)

```
data: { blocks: Block[] }               // list, max 20
Block { id, heading: text 1–120 (required), body: longText 1–3000 (required) }
```

- **Public shape** `PublicExamination { blocks: { id; heading; paragraphs: string[] }[] }`. Paragraphs are split on blank lines, single newlines are folded to spaces, and empty ones are dropped.
- **Defaults**: `blocks: []`.

## Group `classLevels` (panel `class-levels`, tab Admission, save: Pages)

```
data: {
  ageReferenceDate: dayMonth "MM-DD" (required, default "07-31"),
  levels: Level[]                       // list, max 30, uniqueText(name)
}
Level { id, name: text 1–60 (required), ageRule: text 1–80 (required) }
// uniqueText(name): duplicates (case- and space-insensitive) block the save with a message naming the row
```

- `id` is stable across rename and reorder. It is what the admission checklist references.
- A deleted row is soft-deleted (kept with its name). Its id stops being "live".
- **Public shape** `PublicClassLevels { ageReferenceDate; ageHeader: "31 July"; levels: { id; name; ageRule }[] }`.
- **Defaults**: `ageReferenceDate: "07-31"`, `levels: []`.

## Group `portalLinks` (panel `portal-links`, tab Site-wide, save: Settings)

```
data: { links: Link[] }                 // list, max 12
Link { id, label: text 1–40 (required),
       url: url 1–2048 (required, http/https only, host required, rejectCredentials, warnInsecure, testLink) }
```

- **Public shape** `PublicPortalLink { id; label; url; insecure: boolean }[]`.
- **Defaults**: `links: []` (footer column hidden until links exist or the seed runs).

## Group `admission` (existing, 013/020) — `classes` items change

| Item field | Before | After |
|---|---|---|
| `id` | uuid | unchanged |
| `name` | text 1–50, required | text 1–60, required. For a linked item, a server-refreshed snapshot of the level's name. For a not-linked item, the legacy typed name |
| `levelId` | — | **new**: text 0–40, default `""`. Non-empty means the id of a `classLevels` level (ticked); empty means not linked |

List rules: `maxItems` 30, `uniqueText(name)` (existing), `uniqueText(levelId)` (new, blanks skipped).

**Server cross-check on save** (panel `admission-classes`, research R7): every non-empty `levelId` must be a live `classLevels` level, or the save is a `conflict`. The `name` of each linked item is replaced with that level's current name.

**Derived states** (not stored):

| State | Condition | Shown |
|---|---|---|
| ticked | `levelId` = a live level id | checkbox checked; offered in the form under the level's current name |
| not linked | `levelId` = `""` | "Not linked" list in the Admission tab; offered in the form after the ticked levels |
| removed | `levelId` ≠ `""` and not a live level | warning naming `name`; not offered; cleared by removing it and saving |

**Offered classes** (`offeredClasses(admission, classLevels)`, pure): the live levels ticked, in `classLevels` order by current name; then the not-linked names in saved order; de-duplicated case- and space-insensitively. An empty result, or a closed window, means the form shows Closed (013 rule, unchanged).

## Registration (`studentRegistrations`, 013) — unchanged

`className` stays the submitted text. Nothing in this feature reads or rewrites stored registrations (FR-034, SC-007).

## State transitions

**Panel save** (all four new panels, and `admission-classes`): as in 014's data model (fingerprint check → group-version CAS, ≤ 3 attempts), with the `admission-classes` cross-check between the fingerprint check and reconcile.

**Pending confirmation**:

```
(no doc / empty) ─ seed --confirm ─→ content + pendingConfirmation{source, seededAt}
pending ─ ordinary save ─→ pending (unchanged)
pending ─ confirm action (right permission) ─→ pendingConfirmation = null   [settings_confirmed logged]
not pending ─ confirm action ─→ no change, nothing logged (idempotent)
has live content ─ seed (any mode) ─→ refused, exit 1, nothing written
```

**Class migration** (`migrate:class-levels`):

```
not linked item ─ name matches a live level (trim/space/case-insensitive), level not already linked ─ --confirm ─→ ticked
not linked item ─ no match / duplicate ─→ stays not linked (reported)
ticked item ─→ skipped
```

## Settings change record (`settingsChanges`) — new collection

Written by `savePanel` after a successful write whenever the save removed at least one item (research R3, spec FR-007).

| Field | Type | Rule |
|---|---|---|
| `_id` | ObjectId | |
| `group` | GroupKey | e.g. `syllabi` |
| `panel` | PanelKey | e.g. `syllabi` |
| `actorEmail` | string | from the session, never the request |
| `at` | Date | the save time |
| `removed` | `{ path: string; label: string; value: object }[]` | one entry per removed item, at the highest level removed (a removed level includes its subjects and groups in `value`); `path` as before the save (`levels.2.subjects.0`); `label` a readable trail ("Class 3 · English") |

Index `{ group: 1, at: -1 }`. Kept indefinitely: public school content, and no personal data beyond the admin's email (as in `userChanges`). Never written for a save that only edits or reorders.

## Security log (`src/lib/log.ts`) — new event types

| Type | Fields | When |
|---|---|---|
| `settings_confirmed` | `group`, `panel`, `actor` | confirm action changed the flag |
| `settings_seeded` | `group`, `counts` (e.g. `{ levels, subjects, groups, topics }`), `actor: "system:014b-seed"` | seed `--confirm` wrote |
| `classes_linked` | `linked`, `unmatched`, `duplicates` (counts), `actor: "system:014b-link-classes"` | migration `--confirm` wrote |
| `settings_change_record_failed` | `group`, `panel`, `counts: { removed }` | the change-record insert failed twice; the save still succeeded |

`settings_saved` (existing) carries the new group and panel keys. Never field values.

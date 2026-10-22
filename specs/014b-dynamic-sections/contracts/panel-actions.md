# Contract: Panel actions (014b additions)

File: `src/app/admin/(dashboard)/settings/actions.ts` (`"use server"`). Extends [014's panel-actions contract](../../014-page-settings/contracts/panel-actions.md). Input, result type, the order of checks and the side effects of the two save actions are unchanged. Only the panels each action accepts grow, and two confirm actions are added.

## Save actions — accepted panels

| Action | First call | Accepts panels (014 → 014b) |
|---|---|---|
| `saveSettingsPanel` | `await requireAdminAccess("settings")` | `contact`, `admission-window`, `admission-classes`, **`portal-links`** |
| `savePagesPanel` | `await requireAdminAccess("pages")` | `hero`, `video`, `stats`, `admission-messages`, **`syllabi`**, **`examination`**, **`class-levels`** |

### `admission-classes` — extra check (between 014 steps 6 and 7)

| # | Condition | Result | Side effects |
|---|---|---|---|
| 6a | a NEW item (its id is not stored yet) has `levelId` ≠ `""` and is not the id of a live `classLevels` level | `conflict` | none |
| 6b | an item that is already stored has a `levelId` whose level has since been deleted (the removed-level warning's leftover) | continue | the item is dropped from the saved list: saving acknowledges the warning (spec FR-035) |
| 6c | otherwise | continue | each linked item's `name` set to its level's current name |

The input `data` for this panel is `{ classes: { id, name, levelId }[] }` (live items only). An item the admin ticks in the checklist is sent as a new uuid with that `levelId` and the level's name.

### Change record (all panels with a group source)

On `success`, if the save removed any item (at any depth, matched by id), one `settingsChanges` entry is written after the write: `group`, `panel`, `actorEmail` (session), `at`, `removed: { path, label, value }[]`. If the insert fails twice, `settings_change_record_failed` is logged and the result is still `success`. Saves that only edit or reorder write no entry, and neither does the first save of a never-saved group (nothing was stored to lose).

### Revalidation (unchanged)

`revalidateTag(SETTINGS_TAG)` and `revalidateTag(settingsGroupTag(group))` with `{ expire: 0 }`, plus `revalidatePath("/", "layout")`. This refreshes `/academics` (syllabi, examination), `/admission` (class levels), the registration form (classes) and every page's footer (portal links).

## Confirm actions (new)

```ts
input:  { panel: string }
result: | { status: "success"; changed: boolean }
        | { status: "error"; error: "unauthorized" | "forbidden" | "unavailable" }
        | { status: "error"; error: "invalid"; fields: { panel: string } }
```

| Action | First call | Accepts panels |
|---|---|---|
| `confirmSettingsPanel` | `await requireAdminAccess("settings")` | panels with `saveAccess: "settings"` and a group source (in practice `portal-links`) |
| `confirmPagesPanel` | `await requireAdminAccess("pages")` | panels with `saveAccess: "pages"` and a group source (in practice `syllabi`, `examination`) |

| # | Condition | Result | Side effects |
|---|---|---|---|
| 1 | no session / disabled / deleted | `unauthorized` | none |
| 2 | session lacks the action's permission | `forbidden` | `access_denied` logged |
| 3 | `panel` unknown or the gallery | `invalid` | none |
| 4 | panel's `saveAccess` ≠ this action's permission | `forbidden` | `access_denied` logged (with `panel`) |
| 5 | database error | `unavailable` | none |
| 6 | the group's document has `pendingConfirmation` ≠ null | `success, changed: true` | `pendingConfirmation` set to null by one conditional update; `settings_confirmed` logged; `revalidatePath(<tab href>)` |
| 7 | otherwise | `success, changed: false` | none (idempotent) |

The actor is always the session. `version`, `data` and `panelSaves` are never touched.

## Guarantees (tested)

- A Pages-only session calling `saveSettingsPanel({ panel: "portal-links" })` gets `forbidden`. Calling `savePagesPanel({ panel: "portal-links" })` also gets `forbidden`, which is logged, and nothing changes.
- A Settings-only session calling `savePagesPanel({ panel: "class-levels" })` gets `forbidden`. Calling `saveSettingsPanel({ panel: "syllabi" })` also gets `forbidden`, which is logged.
- `admission-classes` saved with a `levelId` deleted after load gets `conflict`, and the stored list is unchanged.
- `admission-classes` saved after a level was renamed stores the new name in the snapshot.
- Saving `syllabi` while `pendingConfirmation` is set leaves it set. `confirmPagesPanel({ panel: "syllabi" })` clears it and logs once, and a second call returns `changed: false` and logs nothing.
- A `portal-links` save with `javascript:alert(1)`, `data:text/html,x`, `/portal/x`, `www.example.org`, `https//broken`, `ftp://x.org` or `https://u:p@x.org` gets `invalid` with `fields["links.<i>.url"]`. `http://203.0.113.5/login` gets `success`.
- A `syllabi` save that removes a subject writes one change record whose `removed[0].value` is the full subject. A save that only reorders levels writes none.
- A `class-levels` save with two rows named "Class 1" and " class  1 " gets `invalid` at `levels.1.name`, with the duplicate-name message.
- A `syllabi` save with 3,001 topics in total gets `invalid` (the `levels` path, naming the 3,000 cap). Any per-level limit + 1 gets `invalid` at that path.

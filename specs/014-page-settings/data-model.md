# Data Model: Settings by Page (014, slice 1)

No new collection. One additive field on `settings`; one one-time write to `user.permissions`; ordinary entries in `userChanges`. Tabs and panels are code, not data.

## SettingsTab (code, `src/lib/settings/panels.ts`)

| Field | Type | Rule |
|---|---|---|
| `key` | `"site-wide" \| "home" \| "about" \| "academics" \| "admission" \| "resources" \| "careers"` | URL slug; order of `SETTINGS_TABS` is the bar order |
| `label` | string | from `settingsCopy.tabs` |
| `access` | `Access` | who may open it: `settings` (Site-wide), `pages` (Home, About, Academics, Resources, Careers), `settings_or_pages` (Admission) |
| `panels` | `PanelKey[]` | in public page order; empty for About, Academics, Careers in this slice (tab hidden, no route) |

## SettingsPanel (code)

| Field | Type | Rule |
|---|---|---|
| `key` | `PanelKey` | `contact`, `hero`, `video`, `stats`, `admission-window`, `admission-messages`, `admission-classes`, `photo-gallery`; also the log's `panel` value |
| `title` | string | the public section's name |
| `anchor` | string | admin fragment id; unique within its tab (`contact`, `hero`, `video`, `stats`, `admission-window`, `admission-messages`, `admission-classes`, `photo-gallery`) |
| `viewOnSite` | string | `/contact`, `/#hero`, `/#why-choose`, `/#progress-dashboard`, `/admission#admission-procedure` (×2), `/admission/register`, `/resources#photo-gallery` |
| `saveAccess` | `"settings" \| "pages"` | contact, admission-window, admission-classes → `settings`; the rest → `pages` |
| `source` | `{ kind: "group"; group: GroupKey; fields: string[] } \| { kind: "gallery" }` | |

**Invariants (unit-tested)**: every top-level field of every group belongs to exactly one panel; every panel appears in exactly one tab; a panel's `saveAccess` is one its tab's `access` admits; panel keys and anchors are unique.

**Derived**: `panelDefinition(panel)` → `GroupDefinition` with only the panel's fields and only the group rules whose fields are all in it.

## Settings record (`settings` collection, 005) — one additive field

| Field | Change |
|---|---|
| `_id`, `data`, `version`, `updatedBy`, `updatedAt` | unchanged; `version` is still the write's compare-and-set counter |
| `panelSaves` | **new, optional**: `{ [panelKey]: { by: string; at: Date } }`, set with `$set: { "panelSaves.<key>": … }` on each panel save. Absent on records saved before 014; readers fall back to `updatedBy`/`updatedAt` |

**Panel fingerprint** (derived, never stored): SHA-256 of the canonical JSON (keys sorted) of the panel's fields taken from `toLiveValue(def, mergeWithDefaults(def, stored.data))`, hex, first 32 characters. Changes whenever any of the panel's fields, list items or item ids change.

### Panel save state transitions

```
load  → { data(panel fields), fingerprint F0, lastSaved }
save(F) ─ fingerprint(stored) ≠ F ─────────────→ conflict (edits kept)
        ─ = F → write if version = v ─ hit ────→ success { F1, data, version }
                                    └─ miss → re-read (≤3 attempts) → … → conflict
```

## User (`user` collection, Better Auth, 011) — one-time grant

| Field | Change |
|---|---|
| `permissions` | `"pages"` added (`$addToSet`) to each non-deleted `content_manager` holding `"settings"` and not already holding `"pages"`. Nothing else changes |

## UserChange (`userChanges`, 011) — existing type

One `permissions_changed` entry per account the grant changed: `actorId: "system"`, `actorEmail: "system:014-grant-pages"`, `targetId`, `targetEmail`, `details: { added: ["pages"], removed: [] }`. None when nothing changed.

## Security log (`src/lib/log.ts`)

`settings_saved` gains optional `panel`. `access_denied` for a wrong-action panel save carries `access` (the action's literal) and the request path, never field values.

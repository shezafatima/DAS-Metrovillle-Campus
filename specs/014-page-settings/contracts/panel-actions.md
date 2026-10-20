# Contract: Panel save actions (014)

File: `src/app/admin/(dashboard)/settings/actions.ts` (`"use server"`). Replaces `saveSettingsGroup`, which is removed.

## Input (both actions)

```ts
{
  panel: string;               // a PanelKey with kind "group"
  expectedFingerprint: string; // as loaded, or as returned by the last successful save
  data: unknown;               // the panel's fields; anything else is dropped by the schema
}
```

## Actions

| Action | First call | Accepts panels |
|---|---|---|
| `saveSettingsPanel` | `await requireAdminAccess("settings")` | `contact`, `admission-window`, `admission-classes` |
| `savePagesPanel` | `await requireAdminAccess("pages")` | `hero`, `video`, `stats`, `admission-messages` |

## Result

```ts
type SavePanelResult =
  | { status: "success"; fingerprint: string; version: number; data: GroupValue; savedAt: string; updatedBy: string }
  | { status: "error"; error: "unauthorized" | "forbidden" | "conflict" | "unavailable" }
  | { status: "error"; error: "invalid" | "image_rejected"; fields: Record<string, string> };
```

## Order of checks and outcomes

| # | Condition | Result | Side effects |
|---|---|---|---|
| 1 | no session / disabled / deleted | `unauthorized` | none |
| 2 | session lacks the action's permission | `forbidden` | `access_denied` logged |
| 3 | `panel` unknown, gallery, or `expectedFingerprint` not a 32-char hex string | `invalid` (`fields.panel`) | none |
| 4 | panel's `saveAccess` ≠ this action's permission | `forbidden` | `access_denied` logged with the action's access |
| 5 | panel schema fails, or the merged group fails the full group schema | `invalid` with field paths | none |
| 6 | stored panel fingerprint ≠ `expectedFingerprint` | `conflict` | none |
| 7 | a new image fails verification | `image_rejected` | the uploaded image is deleted (as in 005) |
| 8 | the group-version write misses 3 times in a row | `conflict` | none |
| 9 | database error | `unavailable` | none |
| 10 | otherwise | `success` | record written (whole group, other panels' fields as stored); `panelSaves.<panel>` set; `revalidateTag(SETTINGS_TAG)`, `revalidateTag(settingsGroupTag(group))` with `{ expire: 0 }`, `revalidatePath("/", "layout")`; `settings_saved` logged with `group` and `panel` |

The acting user is always the session; nothing in the input names an actor. Next's Origin check on Server Actions applies (005 FR-002).

## Guarantees (tested)

- A save never changes a stored field outside its panel, whatever `data` contains.
- Saving panel A, then panel B of the same group with B's original fingerprint, succeeds (own save is not a conflict).
- Admin X saves panel A; admin Y then saves A with the old fingerprint → `conflict`, the stored value is X's.
- Admin X saves A while Y saves B of the same group at the same moment → both succeed, and the stored record has both changes.
- A Pages-only session calling `saveSettingsPanel` → `forbidden`; calling `savePagesPanel` with `panel: "admission-window"` → `forbidden`, logged, dates unchanged.

## Gallery actions (unchanged contract, new access)

`src/app/admin/(dashboard)/settings/resources/gallery/actions.ts` (moved): all nine actions now call `await requireAdminAccess("pages")`. `revalidatePath` targets move from `/admin/settings/gallery…` to `/admin/settings/resources…`.

## Upload signer

`POST /api/admin/settings/uploads/sign`: `await requireAdminAccess("pages")` (hero and gallery images are both Pages). Path unchanged.

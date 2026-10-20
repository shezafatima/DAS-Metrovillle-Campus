# Contract: Settings engine extension and the `admission` group

Extends 005 (`specs/005-settings/contracts/field-definitions.md`, `settings-actions.md`). Existing groups' behaviour is unchanged.

## Engine additions (`src/lib/settings/types.ts`)

```ts
export type DateField = FieldBase & {
  type: "date";
  default?: string;          // "YYYY-MM-DD" or "" (default "")
};

export type GroupRule = { kind: "dateOrder"; from: string; to: string; message: string };

export interface GroupDefinition {
  key: GroupKey;
  label: string;
  fields: Field[];
  rules?: GroupRule[];       // new, optional
}

export const GROUP_KEYS = ["contact", "hero", "stats", "video", "admission"] as const;
```

Touch points (all exhaustive switches over `Field["type"]`):

| File | Change |
|---|---|
| `src/lib/settings/schema.ts` | `dateSchema(field)`: `""` or a real date (`/^\d{4}-\d{2}-\d{2}$/` + round-trip through `Date.UTC`); `required` → non-empty. `schemaFor` applies `def.rules` in `superRefine` (issue path `[rule.to]`). |
| `src/lib/settings/defaults.ts` | `case "date": return field.default ?? ""`. |
| `src/components/admin/settings/field-control.tsx` | `case "date"`: `<input type="date">` in `FormField`/`FormLabel`/`FormControl`, value `""` ↔ empty; clears its error on change. |
| `src/lib/settings/public.ts` | `PublicShapes.admission` + `toPublicShape` case (strings, `""` when missing). |
| `src/lib/settings/registry.ts` | `admission: admissionDefinition`. |
| `src/content/admin.ts` | `settingsCopy.groups.admission` (title "Admission", description), `fields.admission` labels/hints, `errors.date` ("Enter a real date."), `errors.closesBeforeOpens` ("Closes on must be on or after Opens on."), status strings. |

## Group definition (`src/lib/settings/groups/admission.ts`)

```ts
export const admissionDefinition: GroupDefinition = {
  key: "admission",
  label: settingsCopy.groups.admission.title,
  fields: [
    { type: "date", key: "opensOn",  label: "Opens on",  hint: "Pakistan time. Admissions open from the start of this day." },
    { type: "date", key: "closesOn", label: "Closes on", hint: "Pakistan time. Admissions close at the end of this day." },
    { type: "text", key: "announcement",  label: "Announcement",   maxLength: 160, hint: "Shown while admissions are open." },
    { type: "text", key: "closedMessage", label: "Closed message", maxLength: 160, hint: "Shown while admissions are closed." },
  ],
  rules: [{ kind: "dateOrder", from: "opensOn", to: "closesOn", message: settingsCopy.errors.closesBeforeOpens }],
};
```

(Labels and hints come from `settingsCopy`; literals shown here for readability.)

## Admin page `/admin/settings/admission`

- `src/app/admin/(dashboard)/settings/admission/page.tsx`: `dynamic = "force-dynamic"`, `await requireAdminPage("settings")`, `getAdminSettings("admission")`, computes `admissionStatusText(admissionWindowState(initial.data, new Date()))`, renders `<SettingsGroupView group="admission" initial={initial} status={…} />`.
- `SettingsGroupView` gains optional `status?: string`, rendered under the description as `<p role="status" data-testid="settings-status">`.
- `SettingsNav` lists it automatically (derived from `GROUP_KEYS`).

## Save action (unchanged code path)

`saveSettingsGroup({ group: "admission", expectedVersion, data })`:

| Case | Result | Stored | Logged |
|---|---|---|---|
| no session | `unauthorized` | nothing | as today |
| content manager without `settings` | `forbidden` | nothing | `access_denied` |
| valid data, Settings permission | `success` | new version, `updatedBy` | `settings_saved` {email, group: "admission"} |
| closesOn < opensOn | `invalid`, `fields.closesOn` | nothing | — |
| text > 160 chars / bad date | `invalid`, field message | nothing | — |
| stale version | `conflict` | nothing | — |

The existing `actions.test.ts` loops over `GROUP_KEYS`, so the three access cases (Constitution XI) cover `admission` automatically.

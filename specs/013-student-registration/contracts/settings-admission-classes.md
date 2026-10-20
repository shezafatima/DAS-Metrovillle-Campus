# Contract: Settings → Admission, "Classes open for admission"

Extends 020's `admission` group (`src/lib/settings/groups/admission.ts`). Edited by users with the `settings` permission, through the existing Settings save action. No new route.

## Field definition

```ts
{
  type: "list",
  key: "classes",
  label: "Classes open for admission",
  hint: "Shown in this order in the registration form's class list.",
  itemLabel: "class",
  itemFields: [{ type: "text", key: "name", label: "Class name", required: true, maxLength: 50 }],
  inlineFields: ["name"],
  layout: "cards",
  summary: { title: ["name"] },
  maxItems: 30,
  rules: [{ kind: "uniqueText", field: "name", message: "This class is already in the list." }],
  default: [],
}
```

## New list rule `uniqueText`

`ListRule` gains `{ kind: "uniqueText"; field: string; message: string }`. In `listSchema`, values are compared after `collapseSpaces(value).toLowerCase()`. The issue is added at `[index, field]` on every later duplicate. Empty values are left to the field's own `required` rule.

## Public shape

`PublicAdmission.classes: string[]`: live items' `name`s in saved order. A deleted or empty item never appears.

## Settings screen

`SettingsGroupView` gains `warning?: string`, rendered under the status line as `<p role="alert" data-testid="settings-warning">`. The admission page passes:

> "Admissions are open but no classes are listed, so the registration form is hidden. Add at least one class."

when `admissionWindowState(saved, now).kind === "open"` and the saved list has no live items.

## Tests

- `src/lib/settings/schema.test.ts`: `uniqueText` (case/space-insensitive duplicates refused; distinct accepted).
- `src/lib/settings/admission.test.ts`: default `[]`; public shape order; deleted items left out.
- `e2e/admin-settings-admission.spec.ts`: add, reorder, remove, save → public dropdown follows; empty list + open window → warning; duplicate/blank name refused.

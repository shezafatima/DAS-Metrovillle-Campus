# Contract: Group and field definitions (005)

The definition format is the only thing an implementer touches to add or change a field (FR-006, SC-009).

```ts
// src/lib/settings/types.ts
type FieldBase = { key: string; label: string; hint?: string; required?: boolean };

type Field =
  | (FieldBase & { type: "text"; maxLength: number; format?: "email" })
  | (FieldBase & { type: "longText"; maxLength: number })
  | (FieldBase & { type: "number"; min: number; max: number })
  | (FieldBase & { type: "url"; maxLength: number; allowPath?: boolean })
  | (FieldBase & { type: "image"; folder: "settings/hero" | "settings/gallery"; kind: string })
  | (FieldBase & { type: "video" })                       // a YouTube address (this phase)
  | (FieldBase & { type: "boolean" })                     // list-item switches such as "Visible"
  | (FieldBase & { type: "group"; fields: Field[] })      // a nested object, e.g. contact.social
  | (FieldBase & {
      type: "list";
      itemFields: Field[];
      maxItems: number;
      reorderable: true;
      rules?: ListRule[];
      itemLabel: string;                                  // "slide", "image"
      layout?: "table" | "cards";                         // rows at >= md, or cards at every width
      summary?: { image?: string; title: string[] };      // item keys for the row thumbnail and title (first non-empty)
      addMode?: "panel" | "upload";                       // add via the Sheet, or via multi-file upload
      inlineFields?: string[];                            // edited on the card, no panel
    });

type ListRule =
  | { kind: "atLeastOneVisible"; field: string; message: string }
  | { kind: "allOrNone"; fields: string[]; message: string };

type GroupDefinition = {
  key: "contact" | "hero" | "stats" | "video" | "gallery";
  label: string;
  fields: Field[];                                        // nested objects use the "group" field type above
};
```

`boolean` and the item `id`/`deletedAt` envelope are engine details; the seven types in the brief (text, long text, number, URL, image, video, list of items) are all present.

## Functions (pure, no server imports, importable by client and server)

| Function | Returns |
|---|---|
| `schemaFor(def)` | Zod schema for the group value. Trims text, enforces limits, `url` scheme allow-list, integer ranges, image reference shape, list rules. |
| `defaultsFor(def)` | Starting value (contact defaults imported from `contactInfo`). |
| `liveItems(list)` | Items whose `deletedAt` is null, in order. |
| `parseYouTubeAddress(text)` | `{ id } \| null` — the only YouTube parser; used by the schema and by 006's embed. |

## Definitions (files)

`src/lib/settings/groups/{contact,hero,stats,video,gallery}.ts` each `export const <group>Definition: GroupDefinition`. `src/lib/settings/registry.ts` exports `GROUPS` (key → definition) and `GROUP_KEYS`; the Server Action, admin pages and public reader look groups up **only** through it, so a key not in the registry is refused everywhere.

## Form rendering

`<SettingsGroupForm definition value version />` (`src/components/admin/settings/settings-group-form.tsx`):

| Field type | Control |
|---|---|
| text / url / video | `Input` with counter when `maxLength` ≤ 200 |
| longText | `Textarea`-style field (existing input primitive) with counter |
| number | numeric `Input`, `inputMode="numeric"` |
| image | `ImageField` — the 003 cover-image flow via the lifted `src/lib/uploads/direct-upload.ts` + `image-limits.ts` (pre-check, signed direct upload, preview with `cloudinaryLoader`, remove) |
| boolean | switch |
| list | `ListEditor`: one list of rows that lay out like table rows at ≥ md and stack as cards below (a single DOM, so no duplicate controls; gallery is always cards), up/down buttons, drag handle, add button, per-item edit in the `Sheet` right panel (fields generated from `itemFields`), delete via `AdminConfirmDeleteDialog` |

All controls sit inside the shared `ui/form.tsx` primitives (`FormField`, `FormLabel`, `FormControl`, `FormMessage`). No group has its own hand-built form component.

Errors from the action are keyed by path and rendered under the matching control. A test (SC-009) adds a field to a copy of a definition and asserts it appears in the form and is enforced by `schemaFor`.

## Limits (single source of truth)

| Thing | Limit |
|---|---|
| Image type / size | JPG, PNG, WebP / 5 MB (`Images must be JPG, PNG or WebP, up to 5 MB.`) |
| Slide heading / button label / alt | 80 / 30 / 150 |
| Gallery caption | 150 |
| Hero display seconds | integer 3–15 |
| Stats | integer 0–100 000 000 |
| Live slides / gallery images | 10 / 200 |
| Images per gallery selection | 20 |

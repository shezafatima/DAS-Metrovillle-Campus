# Contract: Settings Server Action and upload signer (005)

## `saveSettingsGroup` (Server Action)

File: `src/app/admin/(dashboard)/settings/actions.ts` (`"use server"`). Same-origin is enforced by Next for every Server Action (FR-002), like 010/011.

```ts
saveSettingsGroup(input: {
  group: "contact" | "hero" | "stats" | "video" | "gallery";
  expectedVersion: number;   // 0 = never saved; else the version the form was loaded with
  data: unknown;             // the group value; validated on the server
}): Promise<SaveSettingsResult>
```

```ts
type SaveSettingsResult =
  | { status: "success"; version: number; data: GroupValue; savedAt: string }
  | { status: "error"; error: "unauthorized" | "forbidden" }
  | { status: "error"; error: "invalid"; fields: Record<string, string> }   // path → message
  | { status: "error"; error: "conflict" }
  | { status: "error"; error: "image_rejected"; fields: Record<string, string> }
  | { status: "error"; error: "unavailable" };
```

Order of work (each step returns on failure; nothing is written until the last):
1. `requireAdminAccess("settings")` → `unauthorized` / `forbidden`.
2. `group` must be one of the five keys, else `invalid` (`fields.group`).
3. Validate `data` with `schemaFor(definition)` — the same schema the form uses. Field paths use the definition keys, list items as `slides.2.alt`. Rules failing → `invalid` (`fields["slides"] = "At least one visible slide is required"`, `fields["slides.1.buttonLink"] = "Add a button label and a link together, or neither"`).
4. Item reconciliation (research R3): unknown-id / resurrected-id → `invalid`; absent live items get `deletedAt`; previous deleted items kept.
5. For every image reference new since the stored version: `verifyUploadedImage(publicId, folder)` → else `image_rejected` with `fields["slides.0.desktop"] = "Images must be JPG, PNG or WebP, up to 5 MB."` (asset best-effort deleted).
6. Compare-and-set write (research R2) with `updatedBy = session.email` → `conflict` if version moved.
7. On success: `revalidateTag("settings", { expire: 0 })`, `revalidateTag("settings:<group>", { expire: 0 })`, `revalidatePath("/", "layout")`; `logSecurityEvent({ type: "settings_saved", email, group })`; return the stored value and new `version`.

Guarantees: the actor is only ever the session (no id/email in the input is read); the response never contains `deletedAt` items; a `conflict`, `invalid` or `image_rejected` stores nothing; the whole group is saved or none of it.

Copy for results lives in `src/content/admin.ts` (`settingsCopy`), not in the action.

## `POST /api/admin/settings/uploads/sign`

Access `settings` (`requireAdminAccess("settings")`; 401/403 per the matrix, `no-store`).

Request: `{ "kind": "hero-desktop" | "hero-mobile" | "gallery" }`
- `hero-desktop`, `hero-mobile` → folder `settings/hero`
- `gallery` → folder `settings/gallery`
- anything else → `400 { "error": "validation", "fields": { "kind": "Unknown upload kind." } }`

Response 200 (same shape as `/api/admin/uploads/sign`, so the browser upload helper is shared): `{ cloudName, apiKey, timestamp, signature, folder, allowedFormats: "jpg,png,webp", transformation: "c_limit,w_2400,h_2400", maxBytes: 5242880 }`. The API secret is never returned.

Multi-file gallery selection (FR-022): the client requests one signature per file and uploads them independently (parallel, max 3 at a time), so one failed file never blocks the rest and the form keeps its other edits (FR-028).

## Public read (server-side only, no route)

`getPublicSettings<G extends GroupKey>(group: G): Promise<PublicShape<G>>` in `src/lib/settings/public.ts`.

- Never throws. Timeout 3 s. On failure returns the last value read by this process, else the definition defaults (FR-032).
- Cached 60 s, tags `settings` and `settings:<group>` (research R5).
- Returns the public shapes in `data-model.md` "Derived / public shapes".

`getContactDetails()` (`src/lib/contact-details.ts`) keeps its signature `Promise<ContactInfo>` and now returns `getPublicSettings("contact")`.

## Admin read (server-side only)

`getAdminSettings(group): Promise<{ data: GroupValue; version: number; updatedAt: Date | null; updatedBy: string | null }>` in `src/lib/settings/admin.ts` — live items only, `version: 0` and defaults when never saved. Called by the group pages after `requireAdminPage("settings")`.

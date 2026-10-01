# Research: Settings (005)

All Technical Context unknowns are resolved here. Sources: the existing code (`src/lib/dal.ts`, `src/lib/cloudinary.ts`, `src/lib/soft-delete.ts`, `src/models/news-post.ts`, `src/components/admin/news/cover-image-field.tsx`, `src/components/site-shell/*`, `src/lib/contact-details.ts`), `docs/architecture.md`, and the Next.js 16.3.5 docs in `node_modules/next/dist/docs/01-app/` (per CLAUDE.md, read before writing code).

## R1. Field definitions drive form and validation (FR-005–FR-007, SC-009)

**Decision**: Each group is a plain typed object in `src/lib/settings/groups/<group>.ts` (a `GroupDefinition`): key, label, ordered `fields`. A field has `key`, `label`, `type` (`text | longText | number | url | image | video | list`), `required`, and type-specific limits (`maxLength`, `min`/`max`, `itemFields` for `list`, `maxItems`). Cross-field rules are declarative entries on the group or list (`allOrNone: ["buttonLabel","buttonLink"]`, `atLeastOne: { field: "visible", message }`). Two functions read the definition and nothing else:
- `schemaFor(definition)` → Zod schema (server validation and client validation import the same one — Constitution VI);
- `defaultsFor(definition)` → starting values.
The admin renders `<SettingsGroupForm definition={…} />`, which maps field types to inputs.

**Rationale**: A new field is one entry in one file; the form, the schema and the defaults follow. No screen per group.

**Alternatives**: hand-written Zod schema + hand-written form per group (rejected: SC-009 and the brief's design principle); JSON-Schema form library (rejected: Constitution II, no new frameworks).

**Type `video`**: the brief lists "video" as a field type. In this phase it means "a YouTube address" only (FR-019, FR-024); no file upload path exists for it.

## R2. Storage: one document per group, optimistic version (FR-004, FR-027, FR-031)

**Decision**: one collection `settings`, document `_id` = the group key (`contact`, `hero`, `stats`, `video`, `gallery`), fields `data` (the validated group value), `version` (integer, starts at 1 on first save), `updatedAt`, `updatedBy` (admin email). A group with no document is "unsaved": reads return the definition defaults with `version: 0`.

Save = one atomic write, no transactions:
- version 0 (no document yet): `insertOne({ _id: key, … version: 1 })`; a duplicate-key error means someone saved first → conflict;
- version n ≥ 1: `findOneAndUpdate({ _id: key, version: n }, { $set: { data, updatedBy }, $inc: { version: 1 } })`; a `null` result → conflict.

A conflict returns the FR-031 message and stores nothing.

**Rationale**: PRD §7 says "one record per group". `_id` as key makes "one per group" a database guarantee (Constitution VI) with no extra unique index, and makes the version compare-and-set a single round trip that also holds under two simultaneous saves. Same "atomic single write, no check-then-insert" discipline as ADR-0001 and the 011 last-main-admin rule.

**Alternatives**: last-write-wins (rejected by the 2026-09-30 clarification); Mongoose `__v` versioning (rejected: only bumps on array `save()`, not on `$set` of `data`); per-item documents for slides and gallery (rejected: the group must save whole and atomically, FR-027, and reordering would become multi-document).

## R3. Soft delete inside a list (FR-033)

**Decision**: list items live inside the group's `data` array, each with a stable `id` (UUID made by the client for new items, validated as a UUID) and `deletedAt: Date | null`. The editor holds and sends only live items, in order. On save the server:
1. rejects any incoming `id` that matches a stored **deleted** item (an item cannot be resurrected through a save);
2. marks every stored live item whose `id` is absent from the payload `deletedAt = now`;
3. keeps all previously deleted items, appended after the live ones.
Public and admin reads filter `deletedAt` out in one function (`liveItems`).

**Rationale**: satisfies Constitution VI ("`deletedAt` marker") and the brief's "recoverable" with no restore screen (clarification 3): a developer restores by clearing `deletedAt`. Keeping deleted items in the same array preserves the atomic whole-group save.

**Alternatives**: the shared `softDeletePlugin` (rejected: it filters *documents*; here the unit of storage is the group document, not the item); a second "trash" collection (rejected: a save would touch two documents, breaking atomicity for no user benefit).

**Bounds**: hero ≤ 10 live slides, gallery ≤ 200 live images, deleted items ≤ 500 per group (oldest dropped past that so a document cannot grow without limit). Well under MongoDB's 16 MB document limit.

## R4. Last visible slide (FR-015, SC-006)

**Decision**: a declarative rule on the hero list, `atLeastOneVisible`, evaluated on the **live items of the payload** by `schemaFor` — so the client blocks the UI control, and the server independently refuses any payload with zero visible live slides (including "hide A and delete B in one save"). Message: "At least one visible slide is required". The admin UI additionally disables hide/delete on the last visible slide.

**Alternatives**: checking only in the UI (rejected: Constitution III/FR-015 require server enforcement).

## R5. Public reads, caching and "within a minute" (FR-003, FR-030, FR-032)

**Decision**: keep `cacheComponents` **off** (enabling it changes the rendering model of every page and would need Suspense work across features 001–011 — out of scope, Constitution II no stack change). Use the previous caching model, which the 16.3.5 docs still document (`caching-without-cache-components.md`, `incremental-static-regeneration.md`):
- `getPublicSettings(group)` in `src/lib/settings/public.ts` wraps the database read in `unstable_cache(…, { revalidate: 60, tags: ["settings", "settings:<group>"] })`. Only live, displayable values are returned (FR-003).
- `(public)/layout.tsx` gets `export const revalidate = 60` so statically rendered public pages regenerate at most once a minute even if the cached entry could not be filled at build time (a page built while the database was unreachable must not keep default values forever).
- A save calls `revalidateTag("settings", { expire: 0 })` and `revalidateTag("settings:<group>", { expire: 0 })`, then `revalidatePath("/", "layout")`, from the Server Action. The Next 16.3.5 docs tie `updateTag` to `cacheTag`/`fetch` tags and give `revalidateTag`/`revalidatePath` for the previous caching model that `unstable_cache` belongs to. `{ expire: 0 }` means the next request is a fresh read, not stale-then-fresh, so the admin's own next view is immediate and other visitors see it within the 60 s window (SC-003).
- Failure path (FR-032, SC-008): the cached function only reads and **throws** on failure, so a failed read is never cached as defaults. `getPublicSettings` calls it inside a 3 s timeout and a `try/catch` **outside** `unstable_cache`; on failure it returns the **last value it successfully read in this server process** (module-level map), else `defaultsFor(definition)`. It never throws into a page. Failures log a `settings_read_failed` security-log-format line without values.
- News pages stay `force-dynamic` (003 research §6); they render the same header/footer through the cached read.

**Alternatives**: `force-dynamic` public layout (rejected: a database read on every public request and it would make every public page dynamic); a client-side fetch of settings (rejected: flash of default content, and no SSR of header/footer); `use cache` (rejected with `cacheComponents` above).

**Caveat recorded**: `unstable_cache` is marked "replaced by `use cache`" in the 16 docs but is supported. Moving to `use cache` later is a change inside `public.ts` only (callers use `getPublicSettings`).

## R6. Contact seam (FR-009, FR-010, SC-001)

**Decision**: `getContactDetails()` in `src/lib/contact-details.ts` (the 008 "only function whose body changes") becomes `getPublicSettings("contact")` mapped to the existing `ContactInfo` shape. The defaults for the `contact` group are **imported from** `contactInfo` in `src/content/site-shell.ts` (not copied), so "starting values equal the current values" is true by construction and `site-shell.test.ts` keeps guarding them. The header `TopBar` and the `Footer` already take `contactInfo`/`contact` — `PublicShell` becomes an async Server Component that awaits `getContactDetails()` once and passes it to `Header`/`TopBar` and `Footer` (the footer's own `contactInfo` import is removed). The Contact page already calls `getContactDetails()`; its markup is untouched. `SocialLinks` already omits a platform with no URL (FR-011) — no change other than tests.

The `mapUrl` "web address" rule keeps `https://maps.google.com/?q=…` valid; `mapEmbedSrc(address)` is unchanged.

## R7. Media: reuse Cloudinary and the direct-upload flow (FR-023–FR-026)

**Decision**: generalise `src/lib/cloudinary.ts` from "news cover" to "signed upload for a folder": `signImageUpload(folder)` and `verifyUploadedImage(publicId, folder)`; `signNewsCoverUpload` / `verifyNewsCover` remain as thin wrappers so 003 code and tests do not change. New folders `settings/hero` and `settings/gallery`. Same limits as news (`jpg,png,webp`, 5 MB, `c_limit,w_2400,h_2400`).
- A new route `POST /api/admin/settings/uploads/sign` (access `settings`, body `{ kind: "hero-desktop" | "hero-mobile" | "gallery" }`). It is separate from `/api/admin/uploads/sign` (access `news`) so each route keeps exactly one access requirement, which the access inventory test enforces.
- The browser uploads directly to Cloudinary (the API secret never leaves the server). Cloudinary itself rejects a file whose real content is not JPG/PNG/WebP (`allowed_formats` is checked against the decoded content, not the filename), which is the "verify actual content" rule of Constitution V. The browser also pre-checks type and size to give the stated message immediately.
- On **save**, the server calls `verifyUploadedImage` for every image reference that is new since the stored version (size ≤ 5 MB, format, folder prefix). Failure → field error with the limit message and best-effort deletion of the orphaned asset.
- `NEWS_COVER_VERIFY=skip` (non-production) is honoured by the new verify as well so Playwright can stub uploads, as in 003. No new env variable.
- The browser pre-check (`precheckImage`) tests the file's leading bytes for a JPEG, PNG or WebP signature as well as the declared type and size, so a renamed PDF is refused before upload. Cloudinary and the on-save check remain the authoritative controls.
- Delivery: `next/image` with the existing `cloudinaryLoader` (`f_auto,q_auto,c_limit,w_<n>`) gives sizes/formats per screen (FR-025). Settings only stores both image references; choosing the mobile image at phone widths happens where slides are rendered (feature 006) — this feature supplies `desktop` and optional `mobile` per slide.

**Alternatives**: Cloudinary upload presets (rejected: dashboard configuration outside the repo); server-side proxy upload (rejected: pushes 5 MB bodies through the app, and 003 already chose direct upload); a second image provider (rejected: Constitution II).

**Placeholder hero (clarification 1)**: the default `hero` value holds one slide whose images point at a static branded file in `public/images/hero/` (SVG, no publicId). The image reference schema accepts an empty `publicId` only when `url` is exactly that known static path, so no client can submit an unverified external URL.

## R8. Reordering without a new dependency (FR-014, FR-022)

**Decision**: up/down buttons are the required, keyboard- and touch-operable mechanism (disabled at the ends, announced via `aria-live`). Dragging uses the browser's native HTML5 drag-and-drop on a grab handle (desktop convenience); both call the same `moveItem(from, to)` reducer.

**Rationale**: no drag-and-drop library is installed and Constitution II forbids new frameworks; a library would be a new runtime dependency for a convenience, and native drag does not work on touch anyway, which is why the buttons are primary. The brief says "drag **or** up/down".

## R9. Unsaved changes and save flow (FR-028, FR-029)

**Decision**: reuse `useUnsavedChanges(isDirty, prompt)` unchanged (covers tab close, reload and in-app links). Group switching is by **links** (one URL per group: `/admin/settings/contact`, `/hero`, `/stats`, `/video`, `/gallery`), so the hook's existing click guard covers it. `/admin/settings` redirects to `/admin/settings/contact`. Dirty is computed by deep-equal of the form state against the last loaded/saved value. Save calls a Server Action and shows results with the 002 toast and field errors.

**Alternatives**: one long page with all groups (rejected: FR-029 "leaving a group" and per-group version conflicts read better with one form per page); tabs with client state (rejected: the link-click guard would not see a state-only switch).

## R10. Server Actions rather than route handlers for saves (FR-001, FR-002)

**Decision**: saving a group is a Server Action `saveSettingsGroup(group, expectedVersion, data)` in `src/app/admin/(dashboard)/settings/actions.ts`, starting with `requireAdminAccess("settings")` — the same pattern as 011's `users/actions.ts`. Next checks the request `Origin` against the host for every Server Action, which satisfies FR-002 exactly as it does for 010/011. Reads happen in Server Component pages (`requireAdminPage("settings")`). The only new route handler is the upload signer (R7).

The three access cases: action tests in `settings/actions.test.ts` and the upload route in `access-matrix.test.ts`; pages in `e2e/admin-roles-access-matrix.spec.ts`; all rows added to `access-inventory.test.ts` `EXPECTED`.

## R11. Logging (FR-034)

**Decision**: `logSecurityEvent({ type: "settings_saved", email, group })` after a successful save (no values); `access_denied` already comes from the DAL. Because the group document stores `updatedAt`/`updatedBy`, "who last saved" is also visible on each group's page footer line ("Last saved by … on …").

## R12. Admin UI composition: reuse, don't rebuild (FR-035, planning direction)

**Decision**: `settings/layout.tsx` renders the group navigation as links that wrap or stack on narrow widths, with no horizontal page scroll. The group page renders `SettingsGroupForm`. Every control comes from an earlier feature (plan.md "Reuse Map"):
- **Form**: `ui/form.tsx` field primitives, `Input`, `Button`, `toast`, `useUnsavedChanges`.
- **Table**: hero slides use `ui/table.tsx` at ≥ md and cards below md, the 011 `users-table`/`user-card` split. Gallery uses cards.
- **Dialog**: `AdminConfirmDeleteDialog`, lifted out of `AdminDeleteDialog`. The existing component does the DELETE request itself, but a settings delete is staged until the group is saved, so the confirm UI is separated from the request. Existing callers keep `AdminDeleteDialog` unchanged.
- **Upload**: the sign → direct-upload helpers and the image limits are lifted out of `CoverImageField` into `src/lib/uploads/`, and `cloudinary.ts` is generalised by folder. News keeps identical behaviour.
- **Right panel**: `ui/sheet.tsx` with 011's `UserPanel` close rules (Escape, outside click, close, Cancel; warn when changed; full width on phones).

Design values come from tokens (Constitution VII); no raw values.

**Alternatives**: a settings-only copy of the delete dialog or the upload code (rejected: the project has lifted shared pieces rather than duplicating them since 004/008, per architecture.md); giving `AdminDeleteDialog` an optional `onConfirm` mode (rejected: two behaviours behind one prop is harder to test than two components).

## R13. What is deliberately not built

- No public `/api/public/settings` route (Constitution X: no speculative second consumer; the chatbot has no requirement on settings). `getPublicSettings` is the one seam if that changes.
- No restore screen, no field-level history (clarification 3, Assumptions).
- No home-page/gallery-page rendering (006, 016) — but `getPublicSettings("hero" | "stats" | "video" | "gallery")` is built and tested here so they can consume it.

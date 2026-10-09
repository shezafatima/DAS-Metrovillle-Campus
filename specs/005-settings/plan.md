# Implementation Plan: Settings

**Branch**: `005-settings` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-settings/spec.md`

## Summary

Turn the `/admin/settings` placeholder into five permission-gated groups (Contact & social, Hero slides, Stats, Home video, Photo gallery). Each group is a typed **definition** from which one generic form, one Zod schema and the starting values are derived. Each group is stored as one MongoDB document keyed by the group name, saved atomically by a Server Action with a version compare-and-set (a save is refused if someone else saved first). List items (slides, gallery images) are soft-deleted inside the document. Images reuse 003's signed direct-to-Cloudinary upload with server verification on save. The public site reads settings through one cached, never-throwing reader (60 s window + tag invalidation on save). The header, footer and Contact page switch to it now; the defaults are imported from today's content file, so nothing visibly changes on release.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16.3.5 App Router, React 19.2
**Primary Dependencies**: Mongoose 9, Zod 4, Better Auth (via `src/lib/dal.ts`), Cloudinary SDK 2, shadcn/ui primitives already in `src/components/ui` (Sheet, Dialog, Button, Input, Toaster), react-icons. **No new dependencies.**
**Storage**: MongoDB Atlas — new collection `settings` (one document per group, `_id` = group key); images in Cloudinary folders `settings/hero`, `settings/gallery`.
**Testing**: Vitest (unit + DB-backed via `describeWithDb`), Playwright (`admin` project, serial).
**Target Platform**: Node server hosting the Next.js app; evergreen browsers; 375/768/1024/1440px.
**Project Type**: Single Next.js web app (public site + admin in one `src/`).
**Performance Goals**: Public pages add no per-request database read (settings cached 60 s). Change visible ≤ 60 s after save (SC-003). Settings read timeout 3 s, then fallback.
**Constraints**: No `cacheComponents` switch (would change every page's rendering model). Group document ≤ well under 16 MB (≤10 slides, ≤200 gallery images, ≤500 retained deleted items). Images JPG/PNG/WebP ≤ 5 MB. No video uploads.
**Scale/Scope**: 1 campus, a handful of admins, 5 groups, ~6 admin pages, 1 route, 1 Server Action.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I Fidelity | Header/footer/Contact render identically on release (defaults imported from `contactInfo`; SC-001 test). Stats defaults from the reference. Flagged conflict: "Who We Are" vs "Why Choose" video name — recorded in spec, final label left to 006. Hero video slides dropped per brief — documented deviation from PRD §5.1. | PASS (flags recorded) |
| II Fixed stack | Only existing stack pieces; Cloudinary used for public media only; no DnD library (native drag + buttons); no `cacheComponents` switch. | PASS |
| III Roles & Access | Every page `requireAdminPage("settings")`, the route and the action `requireAdminAccess("settings")`; server-side list rule for the last visible slide; menu hiding is presentation only. | PASS |
| IV Security | Cloudinary secret stays in the sign route; env-only secrets; no new public write endpoint; Server Action same-origin check. | PASS |
| V Personal data / upload verification | Settings holds no personal data. Uploads verified by real content (Cloudinary `allowed_formats` decode) and re-verified server-side on save (size, format, folder). | PASS |
| VI Data integrity | Shared Zod schema from the definition for client and server; soft delete via `deletedAt` on list items; one-per-group guaranteed by `_id`; compare-and-set write (no check-then-insert). | PASS |
| VII Design system | Admin UI uses existing primitives and tokens; public layout unchanged. | PASS |
| VIII Content | Typed field groups, fixed layout, no add/remove/reorder of groups or fields; content-file defaults share the DB shape; live without redeploy. | PASS |
| IX Components | Server Components by default; client only for the group form, list editor, image field. | PASS |
| X Extensibility | `getPublicSettings` returns plain data shapes a second consumer could use; no speculative public API. | PASS |
| XI Testing & DoD | One E2E per story; three access cases for every page, route and action; upload rejection and last-visible-slide tests; layout checks at 4 widths. | PASS |

**Post-design re-check (after Phase 1)**: unchanged — all PASS. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/005-settings/
├── spec.md
├── plan.md               # this file
├── research.md           # Phase 0
├── data-model.md         # Phase 1
├── quickstart.md         # Phase 1
├── contracts/
│   ├── access-matrix.md
│   ├── settings-actions.md
│   └── field-definitions.md
├── checklists/requirements.md
└── tasks.md              # /sp.tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── lib/settings/
│   ├── types.ts                 # Field, GroupDefinition, GroupKey, value types
│   ├── groups/{contact,hero,stats,video,gallery}.ts
│   ├── registry.ts              # GROUPS, GROUP_KEYS
│   ├── schema.ts                # schemaFor(def), list rules, url/image/video rules
│   ├── defaults.ts              # defaultsFor(def); contact defaults from contactInfo
│   ├── youtube.ts               # parseYouTubeAddress
│   ├── items.ts                 # liveItems, reconcileItems (soft delete), moveItem
│   ├── admin.ts                 # getAdminSettings (server)
│   ├── mutations.ts             # saveGroup: validate → reconcile → verify images → CAS write
│   └── public.ts                # getPublicSettings: unstable_cache 60s + tags, timeout, fallback
├── lib/cloudinary.ts            # + signImageUpload(folder), verifyUploadedImage(); news wrappers kept
├── lib/uploads/direct-upload.ts # lifted from cover-image-field.tsx (sign → direct upload)
├── lib/uploads/image-limits.ts  # JPG/PNG/WebP, 5 MB, message — shared by news and settings
├── lib/contact-details.ts       # getContactDetails() → getPublicSettings("contact")
├── models/settings.ts           # `settings` collection
├── content/admin.ts             # + settingsCopy (labels, messages, toasts)
├── app/admin/(dashboard)/settings/
│   ├── layout.tsx               # group navigation (not a gate)
│   ├── page.tsx                 # redirect → /admin/settings/contact (checks access first)
│   ├── {contact,hero,stats,video,gallery}/page.tsx
│   ├── actions.ts               # saveSettingsGroup
│   └── actions.test.ts
├── app/api/admin/settings/uploads/sign/route.ts (+ route.test.ts)
├── app/(public)/layout.tsx      # + export const revalidate = 60
├── components/site-shell/{public-shell,header,top-bar,footer}.tsx  # pass contact from getContactDetails()
├── components/admin/settings/
│   ├── settings-group-form.tsx  # generic form from a definition
│   ├── field-control.tsx        # type → control
│   ├── image-field.tsx          # signed upload, pre-checks, remove
│   ├── list-editor.tsx          # rows, up/down, native drag, add/edit in Sheet, delete dialog
│   ├── gallery-uploader.tsx     # multi-select, per-file progress, max 3 parallel
│   ├── slide-panel.tsx          # Sheet, fields generated from hero itemFields
│   └── settings-nav.tsx
├── components/admin/admin-delete-dialog.tsx  # split: AdminConfirmDeleteDialog + existing wrapper
├── components/admin/news/cover-image-field.tsx  # now imports lib/uploads/* (no behaviour change)
└── test/access-inventory.test.ts, app/api/admin/access-matrix.test.ts  # + rows

public/images/hero/placeholder-{desktop,mobile}.svg   # branded default slide (clarification 1)

e2e/
├── admin-settings-access.spec.ts
├── admin-settings-contact.spec.ts
├── admin-settings-hero.spec.ts
├── admin-settings-stats-video.spec.ts
├── admin-settings-gallery.spec.ts
├── admin-settings-uploads.spec.ts
├── admin-settings-saving.spec.ts
├── helpers/settings.ts          # seed/clear `settings`, stub Cloudinary upload
└── admin-roles-access-matrix.spec.ts   # + settings pages
```

**Structure Decision**: single Next.js app, following the existing `src/lib/<domain>/`, `src/components/admin/<domain>/`, `app/admin/(dashboard)/<section>/` layout used by news, messages and users. Settings lives under `lib/settings` and `components/admin/settings`.

## Reuse Map (planning direction, 2026-09-30)

Planning input: *"Each settings group is defined as a list of typed fields, and the admin form is generated from that definition rather than hand-built per group. Reuse the shared form, table, dialog, upload and right-panel patterns from earlier features. Header, footer and Contact page read from Settings, seeded with their current content-file values."*

| Pattern | Existing piece (feature) | How Settings uses it | Change to the shared piece |
|---|---|---|---|
| Form | `src/components/ui/form.tsx` (`Form`, `FormField`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, 002), `Input`, `Button`, `toast` (`toaster.tsx`), `useUnsavedChanges` (003/010) | `SettingsGroupForm` renders every field through `FormField`/`FormLabel`/`FormControl`; field errors keyed by path; results as toasts; dirty guard. **No per-group form component exists.** | None |
| Table | `src/components/ui/table.tsx` + the table-on-wide / cards-on-narrow split of `users-table.tsx`/`user-card.tsx` (011) | `ListEditor` shows hero slides as `Table` rows (thumbnail, alt/heading, visible, order controls, actions) at ≥ md and as stacked cards below md. Gallery uses the card layout at every width (images need space). | None |
| Dialog | `AdminDeleteDialog` (008, lifted from 004) over `ui/alert-dialog.tsx` | Confirm before removing a slide or gallery image. | **Lift**: split into `AdminConfirmDeleteDialog` (trigger, copy, `onConfirm`) and keep `AdminDeleteDialog` as a thin wrapper that adds the `fetch DELETE` + toasts. Settings deletes are staged until Save, so they need the confirm without the request. Same lift pattern as 004→008; existing callers unchanged. |
| Upload | `CoverImageField` (003): type/size pre-check, `requestSignature()` → direct Cloudinary upload, `cloudinaryLoader` preview; `signNewsCoverUpload`/`verifyNewsCover` | `ImageField` and `GalleryUploader` use the same flow against `/api/admin/settings/uploads/sign`. | **Lift**: move `requestSignature`/`uploadToCloudinary` out of `cover-image-field.tsx` into `src/lib/uploads/direct-upload.ts` (params: sign endpoint, kind), and the MIME/size pre-check + limit constants into `src/lib/uploads/image-limits.ts`. Generalise `cloudinary.ts` to `signImageUpload(folder)`/`verifyUploadedImage(publicId, folder)`, keeping the news functions as wrappers. `CoverImageField` behaviour and 003 tests unchanged. |
| Right panel | `ui/sheet.tsx` + `UserPanel` behaviour (011 FR-036–FR-038: slides in from the right, full width on phones, Escape/outside/close/Cancel, warns when changed) | Add/edit one hero slide in a `Sheet`, whose fields are generated from the slide's `itemFields` definition, with the same close-with-changes warning. "Done" puts the slide into the group form; the group Save persists it. | None (the dirty-close guard is extracted to `useSheetDirtyGuard` only if `UserPanel` keeps it inline — decided in tasks, no behaviour change) |
| Access | `requireAdminPage` / `requireAdminAccess` (011), access inventory + matrix tests | `settings` key on every page, the route and the action. | Rows added to tests only |

**Header, footer, Contact page → Settings, seeded from the content files**: `getContactDetails()` (the 008 seam) reads `getPublicSettings("contact")`. The `contact` group's defaults are **imported** from `contactInfo` in `src/content/site-shell.ts`, not copied. A group that has never been saved has no database document and reads as those defaults, so the "seed" holds from the first request with no seed script or migration step. The first admin save writes the document. `PublicShell` awaits `getContactDetails()` once and passes the result to `Header`→`TopBar` and `Footer`. `Footer` stops importing `contactInfo` directly. The Contact page markup is unchanged.

## Key Decisions (see research.md)

1. **Definition-driven groups** (R1) — one generic form + `schemaFor` + `defaultsFor`; adding a field = editing one definition.
2. **One document per group, `_id` = key, version compare-and-set** (R2) — atomic whole-group save; refuses stale saves (clarification 2).
3. **Soft delete inside the group document** (R3) — items get `deletedAt`, never resurrectable by a save; developer restore (clarification 3).
4. **Public read = `unstable_cache` 60 s + tags + `revalidateTag`/`revalidatePath` on save + in-process last-good fallback** (R5); `cacheComponents` stays off.
5. **Reuse 003's signed direct upload** with a settings-scoped sign route and on-save verification (R7).
6. **Up/down buttons primary, native drag secondary**, no new library (R8).
7. **One URL per group**, so the existing `useUnsavedChanges` link guard covers group switching (R9).

## Risks and follow-ups

- **Stale header during an outage**: after a server restart with the database down, pages render the content-file defaults, which are placeholders. Acceptable per FR-032; mitigated by `revalidate = 60` so recovery is automatic.
- **Orphaned Cloudinary assets** from uploads never saved (form abandoned). Low cost; a clean-up job is out of scope — note for a later ops task.
- **`unstable_cache` is legacy in Next 16** — isolated in `lib/settings/public.ts`; migrating to `use cache` needs `cacheComponents` project-wide, which is its own decision.

## Complexity Tracking

No constitution violations to justify.

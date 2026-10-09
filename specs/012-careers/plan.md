# Implementation Plan: Careers — Application Form with CV Upload and Admin Applications

**Branch**: `012-careers` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-careers/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a public `/careers` page (banner, static intro, one-grid application form) whose client `CareersForm` posts name, email, phone, qualification, consent and one PDF CV as `multipart/form-data` to `POST /api/public/careers`. The route runs: size guard (4 MiB + 64 KiB, capped reader) → honeypot → `"careers"` submission limit (5 per 10 min) → separate upload limit (10 per 24 h) → shared Zod schema + content check of the PDF (`%PDF-` header, `%%EOF` trailer, 1 B–4 MiB) → under **per-identity database locks** (email and phone, ADR-0008), a check for any non-deleted application from the same email **or** phone in the last `CAREERS_REAPPLY_WINDOW_DAYS` (30) → **insert first as pending**. A repeat inside the window gets a 409 naming the date the person may reapply, before any file is written. After 30 days a new, separate application is created and the earlier one is kept (client confirmation pending). Then the bytes go to the **private document store** under a random 256-bit key, and the record is marked stored. If the store fails, the pending record is removed and the visitor keeps their typed details.

The store is a **Vercel Blob private store** (owner's choice) behind a small `DocumentStore` interface, plus a `local` driver for dev and E2E that production refuses. Because Vercel Functions cap request bodies at 4.5 MB, the CV limit is **4 MB** (owner-approved change from the brief's 5 MB). The admin gets **Applications** (`/admin/careers`: list, search, pagination, export) and a detail page with a CV download proxied through a session- and permission-checked route as an attachment, never shown inline. Delete is main-admin only, a soft delete that also removes the file. Retention (configurable, default 12 months) is an hourly opportunistic sweep plus `npm run sweep:careers`. Notifications and the Overview move from signups to applications. All of 004 signup is removed, with its shared helpers and tokens kept.

## Technical Context

**Language/Version**: TypeScript strict, Next.js 16.3.x App Router, React 19, Node runtime for route handlers — unchanged.
**Primary Dependencies**: **One new: `@vercel/blob` ^2.8** (private store; client for the constitution's already-named "private object store", research §1). Reused: `protectPublicForm`/`checkRateLimit`/`tooManyRequestsResponse`, `HONEYPOT_FIELD`, `softDeletePlugin`, `requireAdminPage`/`requireAdminAccess`, `accessErrorResponse` and the route-error helpers, `normalisePakistaniMobile`/`formatPhoneLocal`/`phoneSearchDigits`, `fieldErrors`/`collapseSpaces`, `Paged`/`ADMIN_PAGE_SIZE`/`escapeRegExp`, `AdminPagination`, `AdminListFilters`, `AdminConfirmDeleteDialog`, `PageBanner`, `NotificationsProvider`, `StatCard`, the contact-form tokens, and `after()` from `next/server`. Lifted to shared: the CSV encoder from `src/lib/signup/csv.ts` → `src/lib/csv.ts`.
**Storage**: MongoDB (Mongoose): new collection `careerApplications` (data-model.md); `adminNotificationStates` gains `careersLastOpenedAt`; `signups` dropped. Private object store: a Vercel Blob **private** store (prod) or a local directory (dev/E2E) — never Cloudinary.
**Testing**: Vitest (pure, jsdom, `describeWithDb`) and Playwright (`forms` and `admin` projects), per research §17. Three access cases for every new admin page and route.
**Target Platform**: Web, server-rendered; hosting still undecided (the store design doesn't depend on it).
**Project Type**: The single existing Next.js app.
**Performance Goals**: SC-001 under 3 minutes to apply. Server work per submission is 1 insert + 1 blob `put` (≤4 MiB) + 1 update. Admin list over hundreds of applications loads in <1 s (indexed `createdAt`, 20 rows). CV download streams, never buffering more than the object.
**Constraints**: CV ≤ 4 MiB (Vercel's 4.5 MB function request limit; owner-approved change from 5 MB), one file, PDF by content. No email. No public URL for any CV. Delete is main-admin only. Retention defaults to 12 months. Every design value comes from a token. Never run `npm run build` and Playwright concurrently.
**Scale/Scope**: 1 model, 1 schema, ~8 modules in `src/lib/careers` + `src/lib/documents` (3 files), 1 public route, 4 admin routes, 3 pages, ~6 components, 1 content file, 3 scripts, ~12 Vitest files, ~4 Playwright specs. Removal: ~40 signup files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Purpose & Fidelity | PASS (flagged) | No reference careers page is captured; the page reuses the reference Contact banner and form styling already extracted (research §13). If one is found on das.edu.pk during the token pass, it becomes the source and any conflict is flagged. PRD v0.4 (2026-10-02) now says email OR phone and a 30-day reapply window, matching ADR-0008 and the spec. Still pending client confirmation: earlier applications kept as separate records. |
| II. Fixed Stack | PASS | The private object store is named in the fixed stack; Vercel Blob (private) is the owner's choice of store ([ADR-0007](../../history/adr/0007-private-document-store-vercel-blob.md)) and `@vercel/blob` its client, not a new provider category. Cloudinary is untouched and never used for CVs. No version upgrades. |
| III. Roles & Access | PASS | Every new page and route calls the DAL once (inventory test). Delete = `main_admin`; the rest = `careers`. Three-case tests for each, with the content-manager-holding-`careers` case for delete. Menu and button hiding is presentation only. |
| IV. Security | PASS | Public route: size guard, honeypot, per-IP submission limit plus a separate upload limit. No secrets in code; store credentials in env, validated at startup. |
| V. Personal Data | PASS | Private store, random 256-bit keys, original filename not stored, download only through a checked route as an attachment (`nosniff`, CSP sandbox), never embedded. Content-verified PDF. Client privacy notice placeholder flagged. Retention deletion automatic (sweep + script), including soft-deleted records. |
| VI. Data Integrity | PASS (v3.0.0) | One shared schema client and server. Soft delete. Write rule stated in the spec and ADR-0008: refuse within a 30-day window, never upsert or merge. The window can't be a unique index, so check + insert run only while holding per-identity locks whose exclusivity is a database unique key (`careerApplicationLocks._id`), exactly the second form VI v3.0.0 allows; concurrency tests in T038. No email. |
| VII. Design System | PASS (gated) | Public UI reuses contact and signup tokens; any new value (file row, checkbox) is extracted into `research/design-tokens.md` first. Admin uses 002 primitives. |
| VIII. Content | PASS | Intro, notice and messages live in `src/content/careers.ts`, shaped for the 014 move. |
| IX. Components | PASS | The page composes `PageBanner`, `CareersIntro`, `CareersFormSection`; client code only in `CareersForm`, the delete dialog, filters and `MarkCareersOpened`. Shared admin-list pieces reused; the CSV encoder lifted rather than copied. |
| X. Extensibility | PASS | `src/lib/careers/*` returns plain DTOs; `DocumentStore` is reusable for 013+ documents; no speculative endpoints. |
| XI. Testing & DoD | PASS (planned) | E2E per story (research §17), three-case access for every admin entry point, four widths for the public page and admin screens. |

No unjustified violations. Complexity Tracking not needed.

**Post-design re-check (after Phase 1)**: unchanged. Design points that pressed on a principle and how they were resolved:
(a) the `local` driver is refused in production by `getEnv()`, so dev convenience can't become a V breach;
(b) window check + insert-first-pending run under database-enforced identity locks (VI v3.0.0), and a refusal leaves no file (ADR-0008);
(c) byte-proxy download instead of signed URLs keeps the object location out of every browser (V);
(d) the sweep removes soft-deleted records after retention too, so soft delete (VI) never becomes indefinite retention (V).

## Project Structure

### Documentation (this feature)

```text
specs/012-careers/
├── plan.md              # This file
├── research.md          # Phase 0: 17 decisions
├── data-model.md        # careerApplications, notification state, throttle keys, lifecycle
├── quickstart.md        # local run, manual checks, production + release steps
├── contracts/
│   ├── public-careers-api.md
│   ├── admin-careers-api.md
│   ├── document-store.md
│   ├── careers-page.md
│   └── access-matrix-delta.md
├── checklists/requirements.md
└── tasks.md             # /sp.tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (public)/careers/page.tsx                         NEW
│   ├── admin/(dashboard)/careers/page.tsx                NEW (careers)
│   ├── admin/(dashboard)/careers/[id]/page.tsx           NEW (careers)
│   ├── admin/(dashboard)/page.tsx                        EDIT Signups card → Applications
│   ├── admin/(dashboard)/layout.tsx                      EDIT applicationsNew seed
│   ├── api/public/careers/route.ts                       NEW
│   ├── api/admin/careers/[id]/route.ts                   NEW DELETE (main_admin)
│   ├── api/admin/careers/[id]/cv/route.ts                NEW GET (careers)
│   ├── api/admin/careers/export/route.ts                 NEW GET (careers)
│   ├── api/admin/careers/opened/route.ts                 NEW POST (careers)
│   └── api/admin/access-matrix.test.ts                   EDIT
├── components/
│   ├── careers/  careers-intro.tsx, careers-form-section.tsx, careers-form.tsx (+tests)   NEW
│   ├── admin/careers/  applications-table.tsx, application-detail.tsx,
│   │                   delete-application-button.tsx, mark-careers-opened.tsx (+tests)    NEW
│   ├── admin/app-sidebar.tsx, admin-shell.tsx, notifications/*                           EDIT kind/count rename
│   └── site-shell/footer.tsx                                                             EDIT Careers link
├── content/careers.ts                                    NEW
├── content/site-shell.ts, admin.ts                       EDIT links, nav, copy
├── lib/
│   ├── documents/  store.ts (interface, getDocumentStore, newCvKey), vercel-blob.ts, local.ts       NEW
│   ├── careers/    rules.ts (CAREERS_REAPPLY_WINDOW_DAYS, reapplyFrom), identity-lock.ts,
│   │               cv-limits.ts, mutations.ts, admin-queries.ts, retention.ts,
│   │               download-name.ts, csv.ts, route-errors.ts, read-capped-body.ts         NEW
│   ├── validation/career-application.ts                  NEW
│   ├── csv.ts                                            NEW (lifted from signup/csv.ts)
│   ├── env.ts                                            EDIT store + retention vars
│   ├── permissions.ts                                    EDIT label
│   ├── site-search.ts                                    EDIT Careers entry
│   └── notifications/  queries.ts, state.ts, mutations.ts, types.ts                       EDIT
├── models/career-application.ts                          NEW
├── models/career-application-lock.ts                     NEW (ADR-0008 locks, TTL)
├── models/admin-notification-state.ts                    EDIT
├── test/access-inventory.test.ts                         EDIT
└── test/fake-document-store.ts                           NEW (Vitest fake store)
scripts/  sweep-careers.ts, retire-signups.ts, check-release-content.ts (prebuild gate)   NEW (+ package.json scripts)
e2e/
├── careers-public.spec.ts, careers-protection.spec.ts, shell-careers-links.spec.ts      NEW
├── admin-careers.spec.ts, admin-careers-access.spec.ts                                  NEW
├── helpers/careers.ts, fixtures/cv-valid.pdf, fixtures/cv-renamed.pdf                    NEW
└── admin-roles-access-matrix.spec.ts, admin-notifications-*.spec.ts                      EDIT
playwright.config.ts   forms project: signup-* → careers-*; webServer env DOCUMENT_STORE_*   EDIT
.gitignore             /.data/                                                             EDIT
docs/architecture.md   document store wiring, careers rules, remove signup sections        EDIT
history/adr/0001-*.md  status → Superseded (collection retired)                           EDIT
```

**Removed (P3, FR-033; full scope confirmed by the owner 2026-10-02)**: `src/models/signup.ts`; `src/lib/signup/*` (all, after `csv.ts` is lifted); `src/lib/validation/signup.ts` (+test); `src/app/api/public/signups/*`; `src/app/api/admin/signups/**`; `src/app/admin/(dashboard)/signups/page.tsx`; `src/components/signup/*`; `src/components/admin/signups/*`; `src/content/signup.ts`; `e2e/signup-*.spec.ts`; `e2e/admin-signups-*.spec.ts`; `e2e/helpers/signups.ts`; `research/extract-signup-tokens.ts` stays (it's the token provenance). **Kept**: `signup-*` tokens and `.signup-honeypot` (used by the contact form), `src/lib/phone.ts`, `admin-datetime.ts`, `route-errors.ts`, `field-errors.ts`, `admin-list-filters.tsx`, `admin-delete-dialog.tsx`, `admin-pagination.tsx`. Signup-only comments in those shared files are updated to remove dead references.

**Structure Decision**: same single Next.js app and folder conventions as 003–011 (architecture.md). A new `src/lib/documents/` is the only module that touches the private store, kept apart from `src/lib/cloudinary.ts` (ADR-0004 negative consequence mitigation).

## Implementation Order (for /sp.tasks)

1. **Foundation**: `@vercel/blob`, env vars, `src/lib/documents/*` + tests, `.gitignore`, lift `src/lib/csv.ts`.
2. **US1 + US2 + US3 (core write path)**: model + indexes, schema, `cv-limits`, `mutations` (insert-first), public route + route tests, content, token pass, page + form, `careers-public.spec.ts`.
3. **US4 admin**: queries, pages, download, export, delete (main admin), access-matrix + inventory updates, `admin-careers*.spec.ts`.
4. **US4 notifications and overview**: state field, queries, kind rename, sidebar and overview, update the 009 specs.
5. **US5 entry points**: top bar, footer, site search.
6. **US6 abuse**: upload limit and sweep throttle (most land in step 2; this step adds dedicated tests).
7. **Retention**: `retention.ts`, `after()` hooks, `sweep:careers` script + tests.
8. **US7 retire signup**: delete files, `retire:signups` script, Playwright config, ADR-0001 status, architecture.md.

## Risks and Follow-ups

- **Store provisioning**: production needs the private Blob store connected to the Vercel project before go-live (quickstart §4); without it, startup fails loudly rather than storing CVs on disk. Choosing Vercel Blob implies Vercel hosting, which `docs/architecture.md` still lists as TODO. Record it there.
- **4 MB vs brief's 5 MB**: owner-approved; the client should know that larger CVs are refused with a clear message.
- **Release gate** (T100): a production build fails while the privacy notice is still a placeholder or `CAREERS_RETENTION_MONTHS` is unset, so Constitution V can't be breached by forgetting.
- **Client confirmations pending**: keeping earlier applications as separate records on reapply (ADR-0008 alternatives E/F if not); that the refusal shows the reapply date (it reveals a recent application exists for the typed email or phone); privacy wording; retention period.
- **Signup removal is irreversible for data**: the owner confirmed full removal (2026-10-02, option a), including the admin list, export, routes and the `signups` collection. `npm run retire:signups` drops data permanently, so take an Atlas snapshot or `mongoexport` of `signups` before running it in production, in case any record turns out to matter.
- **X-Forwarded-For trust** (002-owned hosting follow-up) affects the per-IP limits here as on every public form.

## Complexity Tracking

Not applicable: no constitution violations.

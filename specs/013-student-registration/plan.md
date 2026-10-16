# Implementation Plan: Student Registration — Admission Form, Window Enforcement and Main-Admin Registrations

**Branch**: `013-student-registration` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-student-registration/spec.md`

## Summary

Add a public `/admission/register` page whose client `RegistrationForm` (six fieldsets, one column on phones, two from 768px) posts JSON to `POST /api/public/registrations`. The route runs these checks in order:

1. size guard
2. honeypot
3. rate limit, 5 per 10 minutes per IP
4. **registration open**: 020's window open AND Settings → Admission "Classes open for admission" not empty, otherwise 403
5. one shared schema built from the class list and the Pakistan "today" (age 2–18, at least one parent mobile, Other mother tongue, reference all-or-none, clean-up)
6. insert into `studentRegistrations` with a random 8-character reference (unique index, retry on collision)

The parent sees the reference number; no email or SMS is sent. `isAdmissionApplyOpen()` now asks the same "registration open" question, and 020's `registrationFormExists` constant is deleted.

The main admin, and only the main admin, gets **Registrations**:
- **List**: search, class filter, a computed likely-duplicate flag, newest first.
- **Detail**: a distinct Health block, status, and a history of changes.
- **Soft delete** with a **Deleted view and restore** for 30 days.
- **CSV export**, each one recorded in `registrationExports`.
- **Notifications**: a sidebar badge, bell items and an Overview card. Previews show the reference and class only.

Content managers get 404 on pages and 403 on routes, and nothing appears in their notifications.

Retention: an hourly opportunistic sweep, triggered from the submission route, the register page and the admin pages, plus `npm run sweep:registrations`. It hard-deletes records older than `REGISTRATION_RETENTION_MONTHS` (default 12) and those deleted 30+ days ago. The careers release gate is extended, so production fails while the registration privacy notice is a placeholder or the retention period is unset.

## Technical Context

**Language/Version**: TypeScript strict, Next.js 16.3.x App Router, React 19, Node runtime for route handlers. Unchanged.
**Primary Dependencies**: **None new.** Reused:
- public forms: `protectPublicForm`, `tooManyRequestsResponse`, `HONEYPOT_FIELD`, route-error helpers
- validation and data: `normalisePakistaniMobile`/`formatPhoneLocal`, `collapseSpaces`/`fieldErrors`, `softDeletePlugin`
- access: `requireAdminAccess`/`decideAccess`
- admission: `getAdmissionWindow`/`karachiToday`/`admissionWindowState` (020)
- admin UI and export: `toCsv`, `Paged`/`ADMIN_PAGE_SIZE`/`escapeRegExp`, `AdminPagination`, `AdminListFilters`, `AdminConfirmDeleteDialog`, `PageBanner`, `StatCard`
- notifications and housekeeping: the 009 notifications provider, `after()`

Lifted to shared:
- `retentionCutoff` → `src/lib/retention.ts`
- the public-form input/error class strings → `src/components/forms/public-form-styles.ts`

**Storage**: MongoDB (Mongoose):
- new `studentRegistrations` and `registrationExports` collections
- `adminNotificationStates` gains `registrationsLastOpenedAt`
- Settings group `admission` gains a `classes` list

No document store (uploads are out of scope).
**Testing**: Vitest (pure, jsdom, `describeWithDb`) and Playwright (`forms` and `admin` projects), per research §18. There are three access cases for every new admin entry point, plus the not-found page check.
**Target Platform**: Web, server-rendered. Hosting is still undecided; nothing here depends on it.
**Project Type**: The single existing Next.js app.
**Performance Goals**:
- SC-001: under 6 minutes to fill the form on a phone.
- Submission: 1 Settings read (cached), 1 rate-limit write, 1 insert.
- Admin list: under 1 s for thousands of rows (indexed `createdAt`, 20 rows, plus one duplicate-count aggregate over ≤ 20 keys).
**Constraints**:
- No email or SMS. No field-level encryption (at-rest encryption only; ADR).
- Personal and health data reaches no log, notification or public response.
- Main admin only, enforced on the server.
- Every design value comes from a token.
- Never run `npm run build` and Playwright concurrently.
**Scale/Scope**: about 1–2 thousand registrations a year.
- 2 models, 1 schema factory, ~8 modules in `src/lib/registration`.
- 1 public route, 5 admin routes, 4 pages.
- ~8 components, 1 content file, 1 script.
- ~14 Vitest files, ~6 Playwright specs.
- Edits to 020 admission, Settings, notifications, DAL, release gate, env, nav and the access tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Purpose & Fidelity | PASS (flagged) | The field list is client-supplied (brief). The page reuses the Admission banner and the contact/careers form styling. Pending client confirmation: notice wording, 12-month retention, mother-tongue options, status labels, first class list (spec "Open Questions"). |
| II. Fixed Stack | PASS | No new dependency, provider or version. |
| III. Roles & Access | PASS | Every page calls `requireAdminPageOr404("main_admin")`, and every route calls `requireAdminAccess("main_admin")`, each exactly once (inventory test). Each has three-case tests, and case 2 is a content manager holding **every** permission. Notifications are gated by role in the query layer, not only in the UI. Hiding the nav item is presentation only. |
| IV. Security | PASS | Public route: body cap, honeypot, per-IP limit (DB), closed-window 403 before validation, no echo of input in errors. Admin mutations are conditional single-document writes. |
| V. Personal Data | PASS (gated) | Registrations are never reachable from any public route. Health and reference details appear only in the admin detail page and CSV. Logs carry ids only, verified by tests that grep captured logs for seeded values. The notice is pending approval, and retention is configurable with automatic deletion. Both are enforced by the release gate. Deleted records are purged at 30 days. |
| VI. Data Integrity | PASS | One shared schema factory for client and server. Soft delete. Write rule: **append-only, no natural key** (siblings share contacts). Repeats are flagged on read and never refused or merged. No per-person limit exists, so no lock is needed. The `reference` is unique by index. ADR to record (below). No email. |
| VII. Design System | PASS (gated) | Reuses the signup/contact tokens. Fieldset legend, radio, select and textarea values are extracted into `research/design-tokens.md` before use. The admin side uses 002 primitives. |
| VIII. Content | PASS | All copy, options, labels and the notice live in `src/content/registration.ts`, shaped for 014. |
| IX. Components | PASS | Server page plus a small client form. Shared admin-list pieces are reused. Public form styles are lifted, not copied a third time. |
| X. Extensibility | PASS | `src/lib/registration/*` returns plain DTOs. `getRegistrationAvailability()` is the single open/closed answer. No speculative endpoints (no public lookup). |
| XI. Testing & DoD | PASS (planned) | E2E for every story, including window boundaries with a non-Pakistan TZ. Four widths, axe open and closed, and the access matrix. |

No unjustified violations. Complexity Tracking is not needed.

**Post-design re-check (after Phase 1)**: unchanged. Four design points pressed on a principle; here is how each was resolved:
- (a) Careers sweeps only on submissions, which would stall between admission windows. Registrations also sweep from page visits, so V's retention holds when no one is submitting (research §10).
- (b) The flag is computed on read and stores a hash, not a second plain copy of the child's name (V, VI; research §7).
- (c) The export record stores neither the search text nor any registration content (V; research §11).
- (d) Content managers get 404, not a "denied" redirect, so even the section's existence is hidden (III; research §12).

## Project Structure

### Documentation (this feature)

```text
specs/013-student-registration/
├── plan.md              # This file
├── research.md          # Phase 0: 18 decisions
├── data-model.md        # studentRegistrations, registrationExports, Settings classes, notification state
├── quickstart.md        # local run, manual checks, release steps
├── contracts/
│   ├── public-registration-api.md
│   ├── admin-registrations-api.md
│   ├── registration-page.md
│   ├── settings-admission-classes.md
│   └── access-matrix-delta.md
├── checklists/requirements.md
└── tasks.md             # /sp.tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (public)/admission/register/page.tsx                        NEW
│   ├── admin/(dashboard)/registrations/page.tsx                    NEW (main_admin, 404)
│   ├── admin/(dashboard)/registrations/[id]/page.tsx               NEW (main_admin, 404)
│   ├── admin/(dashboard)/registrations/deleted/page.tsx            NEW (main_admin, 404)
│   ├── admin/(dashboard)/settings/admission/page.tsx               EDIT warning prop
│   ├── admin/(dashboard)/page.tsx                                  EDIT Registrations card (main admin)
│   ├── admin/(dashboard)/layout.tsx                                EDIT registrationsNew seed
│   ├── api/public/registrations/route.ts (+test)                   NEW
│   ├── api/admin/registrations/[id]/route.ts (+test)               NEW PATCH status, DELETE
│   ├── api/admin/registrations/[id]/restore/route.ts (+test)       NEW POST
│   ├── api/admin/registrations/export/route.ts (+test)             NEW GET
│   ├── api/admin/registrations/opened/route.ts (+test)             NEW POST
│   └── api/admin/access-matrix.test.ts                             EDIT 5 rows
├── components/
│   ├── forms/public-form-styles.ts                                 NEW (lifted from contact/careers)
│   ├── contact/contact-form.tsx, careers/careers-form.tsx          EDIT use shared styles
│   ├── registration/ registration-form.tsx, registration-closed.tsx,
│   │                 registration-confirmation.tsx (+tests)        NEW
│   ├── admin/registrations/ registrations-table.tsx, registration-detail.tsx,
│   │                 status-control.tsx, delete-registration-button.tsx,
│   │                 restore-registration-button.tsx, deleted-table.tsx,
│   │                 mark-registrations-opened.tsx (+tests)        NEW
│   ├── admin/settings/settings-group-view.tsx                      EDIT warning
│   ├── admin/settings/list-editor.tsx                              EDIT only if addMode "inline" is needed (research §15)
│   └── admin/app-sidebar.tsx, notifications/*                      EDIT registration kind and badge
├── content/
│   ├── registration.ts                                             NEW
│   ├── admission/registration.ts                                   DELETE
│   └── admin.ts                                                    EDIT nav, settings labels/hints, registrations admin copy
├── lib/
│   ├── registration/ rules.ts, age.ts, reference.ts, duplicate-key.ts, availability.ts,
│   │                 mutations.ts, admin-queries.ts, csv.ts, retention.ts (+tests)   NEW
│   ├── validation/registration.ts (+test)                          NEW schema factory
│   ├── validation/field-errors.ts                                  EDIT collapseInlineSpaces
│   ├── admission/server.ts                                         EDIT isAdmissionApplyOpen via availability
│   ├── settings/ types.ts, schema.ts, groups/admission.ts, public.ts, defaults.ts   EDIT classes + uniqueText
│   ├── notifications/ types.ts, queries.ts, state.ts, mutations.ts EDIT
│   ├── dal.ts                                                      EDIT requireAdminPageOr404
│   ├── retention.ts                                                NEW (retentionCutoff lifted from careers)
│   ├── env.ts                                                      EDIT REGISTRATION_RETENTION_MONTHS
│   └── log.ts                                                      EDIT event types
├── models/ student-registration.ts, registration-export.ts         NEW
├── models/admin-notification-state.ts                              EDIT
└── test/access-inventory.test.ts                                   EDIT page404 kind + rows
scripts/
├── sweep-registrations.ts                                          NEW (+ package.json "sweep:registrations")
└── check-release-content.ts (+test)                                EDIT registration notice + retention
e2e/
├── registration-public.spec.ts, registration-window.spec.ts,
│   registration-protection.spec.ts                                 NEW
├── admin-registrations.spec.ts, admin-registrations-access.spec.ts NEW
├── helpers/registrations.ts                                        NEW (seed, settings, e2e-now)
├── admin-settings-admission.spec.ts, admission*.spec.ts            EDIT classes; Apply Now via Settings
└── admin-roles-access-matrix.spec.ts, admin-notifications-*.spec.ts EDIT
docs/architecture.md                                                EDIT registration flow, access, retention
specs/011-roles-and-users/contracts/access-matrix.md                EDIT rows
specs/020-admission/spec.md                                         NOTE constant removed by 013 (no requirement change)
```

**Structure Decision**: The same single Next.js app and folder conventions as 003–020. `src/lib/registration/` is the only module that reads or writes `studentRegistrations`. Notifications reach it through its exported filter, as they already do for careers.

## Implementation Order (for /sp.tasks)

1. **Foundation**: env var, log types, `src/lib/retention.ts` lift, models and indexes, `rules`/`age`/`reference`/`duplicate-key` and their tests, the schema factory and its tests, `collapseInlineSpaces`.
2. **Settings classes (US5)**: `uniqueText` rule, the field, public shape, warning, admission page. Tests.
3. **Availability and window (US2)**: `availability.ts`, `isAdmissionApplyOpen` rewrite, delete the constant, update 020's tests.
4. **Public write path (US1, US6)**: content file, mutations (insert and retry), route and its tests, shared form styles plus the serif check, page and form components, then the token pass.
5. **Admin (US3)**: queries (list, search, filter, duplicate counts, detail), pages, status, delete, Deleted view, restore, CSV and export record.
6. **Access (US4)**: `requireAdminPageOr404`, inventory kind, matrix rows, nav, notifications, Overview card.
7. **Retention and gate (US7)**: sweep, triggers, script, release gate, notice months.
8. **E2E and polish (US8)**: the Playwright specs, axe, four widths, architecture.md, the 011 matrix doc.

## Risks and Follow-ups

- **Sweep depends on traffic**: if no one opens the register page or the admin pages, nothing is swept. Follow-up: a scheduled job once hosting is chosen (002). Meanwhile, `npm run sweep:registrations` can be run by hand.
- **X-Forwarded-For trust** (002 hosting follow-up): affects the per-IP limit, as on every public form.
- **Client confirmations** (notice, retention, mother tongues, status labels, classes): the release gate covers the first two. Changing the other three is a content edit.

## Architectural decision

[ADR-0012](../../history/adr/0012-student-registration-data-handling.md) (Accepted 2026-10-15): an append-only write rule with a read-time likely-duplicate flag; at-rest encryption only; main-admin-only visibility with a 404 for content managers; a 30-day soft-delete grace with restore; and a sweep triggered by page visits as well as submissions. It also amends ADR-0011's `isAdmissionApplyOpen()` condition from "window AND form-exists constant" to "window AND class list not empty".

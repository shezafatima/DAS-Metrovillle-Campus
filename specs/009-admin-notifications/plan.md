# Implementation Plan: Admin Notifications

**Branch**: `009-admin-notifications` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-admin-notifications/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a bell in the admin top bar and matching Messages/Signups sidebar
badges that agree with each other because both read one client-side
`NotificationsProvider`, itself polling a new `GET
/api/admin/notifications` endpoint about once a minute (paused while
the tab is hidden) and refreshed immediately after any message/signup
mutation. Messages reuse 008's existing `status === "new"` rule
unchanged; signups gain their first "new" concept — created or
re-submitted after the admin's last visit to the Signups list — backed
by exactly one new collection, `adminNotificationStates`, storing one
per-admin timestamp (lazily defaulted to "now" on first use, so
pre-existing signups never flood in as new the day this ships). The
bell's panel is a new shared `Popover` primitive (Base UI, already in
the fixed stack) listing the ten newest items across both kinds,
mixing them by arrival time; "Mark all as read" advances that same
timestamp and bulk-marks new messages read. The admin Overview's two
"new" highlights are computed server-side from the same query
functions at render time — agreeing with the sidebar without needing
to be client-polled themselves. The browser tab title gains a live
count prefix. No new dependencies, env vars or schema changes to
`messages` or `signups`.

## Technical Context

**Language/Version**: TypeScript strict on Next.js 16.3.x (App Router), React 19, Node 24 — unchanged.
**Primary Dependencies**: **None new** (research §10). Reused as-is: `requireAdminSession`, `connectDb`, `softDeletePlugin`, `Badge` (`highlight`), `Toaster`/`toast`, `AppSidebar`/`SidebarMenuBadge`'s collapsed-state positioning, `AdminShell`, `@base-ui/react` (its `popover` module, alongside the already-used `dialog`/`drawer`/`tooltip`). `countNewMessages()` (008) reused unchanged; `Signup`'s existing `lastSignupAt` (004) reused unchanged.
**Storage**: MongoDB Atlas Flex via the cached Mongoose connection — one new collection `adminNotificationStates` (data-model.md): one document per admin, keyed by the admin's Better Auth user id, no secondary index. No schema change to `messages` or `signups`.
**Testing**: Vitest (pure: `formatCount`, `formatRelativeTime`, notification-item merge/sort; `describeWithDb`: `countNewSignups` incl. repeat-submission-counts-again and deleted-excluded, `listNotificationItems` merge and 10-item cap, `markAllNotificationsRead`, lazy state creation defaults to "now"; route tests incl. **401 for all three new routes**) and Playwright (`admin` project: bell open/list/choose/mark-all-read, sidebar badges expanded/collapsed at four widths, journey seeding a message and a signup, protected-route matrix, page-title prefix).
**Target Platform**: Web, server-rendered; Node runtime for route handlers (Mongoose).
**Project Type**: Single existing Next.js app (see Project Structure).
**Performance Goals**: SC-001/SC-006 indicators update immediately after an in-tab mutation (a direct `refreshNow()` fetch, not the 60-second timer) and within about a minute otherwise (SC-005) — two lightweight `countDocuments` calls plus two capped-at-10 `find` calls per poll, well within the existing per-admin-page query budget. Panel-open fetch adds no more work than one existing poll tick would.
**Constraints**: Constitution II (no new dependency — `@base-ui/react/popover` already ships in the fixed stack; polling uses platform `fetch`/`visibilitychange`, not a library); III (every new route calls `requireAdminSession({ mode: "api" })`); IV (no email; `adminNotificationStates` is not soft-deleted — it is a per-admin pointer, overwritten, not user data to preserve); VI (one shared `NotificationsProvider`/`Popover`/`NotificationBadge`, not duplicated per consumer; copy in `src/content/admin.ts`); VII (`src/lib/notifications/*` are plain functions returning DTOs, no speculative endpoints beyond what the spec's three interactions need); VIII (E2E per user story, 401 per new admin route, four widths, expanded/collapsed sidebar).
**Scale/Scope**: 1 new model, 0 new Zod schemas (no user-submitted input — every new route takes no body except the implicit session cookie), ~6 `src/lib/notifications`/shared modules, 3 route handlers (all admin), 1 new shared UI primitive (`Popover`), ~6 new admin notification components, 5 modified existing files (`dal.ts`, dashboard layout, `AdminShell`, `AppSidebar` + its test, Overview page, Signups page), 1 content-copy addition, ~10 Vitest files, ~5 Playwright specs, 0 env vars.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Purpose & Fidelity | PASS | No visual reference exists for this feature (it isn't part of the `das.edu.pk` reference site — it's new admin functionality); scope comes from `docs/prd.md` §6 and the brief. No conflicting sources to flag. |
| II. Fixed Stack | PASS | No dependency, env var or version change. `@base-ui/react/popover` is part of the already-installed `@base-ui/react` (research §4, §10); polling uses platform `fetch`/`document.visibilityState`, not a new data-fetching library (research §3). |
| III. Security | PASS | `GET /api/admin/notifications`, `POST .../notifications/read`, `POST /api/admin/signups/opened` all call `requireAdminSession({ mode: "api" })` first; 401 tests for each (contracts/admin-notifications-api.md). The bell/sidebar/title are mounted only inside the authenticated `AdminShell`, so they cannot render on the login page by construction (not a runtime check that could be forgotten). |
| IV. Data Integrity | PASS | No new public-facing input, so no new Zod schema. `adminNotificationStates` is an idempotent upsert-by-admin-id, not a natural-key business record — Constitution IV's soft-delete rule doesn't apply to it (there is nothing to "delete," only to overwrite). No email notifications. |
| V. Design System | PASS | No new design tokens — the bell, badges and panel reuse existing tokens/components (`Badge` `highlight` variant, admin spacing/typography); the new `Popover` primitive is styled with the same motion/token classes `dialog.tsx` already uses. |
| VI. Components | PASS | One shared `NotificationsProvider` (not duplicated state per consumer), one shared `Popover` primitive (not a one-off overlay), one shared `NotificationBadge` (dot/count logic lives in exactly one place). Copy lives in `src/content/admin.ts` (`notificationsCopy`), not hardcoded in components. |
| VII. Extensibility | PASS | `src/lib/notifications/*` are plain functions returning DTOs (`NotificationItem`, `NotificationsSummary`); no speculative endpoint beyond the three the spec's three interactions need (poll, mark-all-read, signups-opened) — no list/history endpoint, since Out of Scope rules that out. |
| VIII. Testing & DoD | PASS (planned) | Spec's E2E acceptance list (SC-001) covered by an admin-notifications journey spec; 401 for all three new routes; four-width + expanded/collapsed visual coverage (SC-004). |

No violations — Complexity Tracking not needed.

**Post-design re-check (after Phase 1)**: unchanged. The two judgment
calls that touched principle boundaries, both resolved toward the
principle: (a) lazily defaulting a never-opened admin's
`signupsLastOpenedAt` to *now* rather than the epoch (research §1) —
chosen over the spec's literal "since last opened" wording because a
sudden flood of pre-existing signups counting as new on launch day
would contradict the feature's own purpose (surfacing genuinely new
arrivals); (b) the Overview cards read the same server-side query
functions at render time rather than the client `NotificationsProvider`
(research §6) — chosen because Out of Scope rules out server-pushed
live updates, and the spec's "same source" requirement is about
correctness, not the Overview page updating every 60 seconds while
idle.

## Project Structure

### Documentation (this feature)

```text
specs/009-admin-notifications/
├── plan.md                                # This file
├── research.md                            # Phase 0 — 10 resolved decisions
├── data-model.md                          # Phase 1 — AdminNotificationState, NotificationItem, read/write paths
├── quickstart.md                          # Phase 1 — run, verify by hand, tests
├── contracts/
│   ├── admin-notifications-api.md         # GET/POST notification routes, signups-opened, 401 matrix
│   └── notification-ui.md                 # Provider/bell/panel/badge/sidebar/title contracts
├── checklists/requirements.md             # from /sp.specify
└── tasks.md                               # Phase 2 (/sp.tasks — not created here)
```

### Source Code (repository root)

```text
docs/architecture.md                                    # + "Admin notifications (009) data rules" section, API namespace entries
e2e/global-setup.ts                                      # + "adminNotificationStates" in the wipe list

src/
├── models/
│   └── admin-notification-state.ts                     # NEW — schema, no plugin (research §1, data-model.md)
├── lib/
│   ├── dal.ts                                           # MODIFIED — AdminSession gains userId
│   ├── format-count.ts                                  # NEW — formatCount() ("99+" rule, research §7)
│   ├── relative-time.ts                                 # NEW — formatRelativeTime() (research §7)
│   └── notifications/
│       ├── types.ts                                     # NEW — NotificationItem, NotificationsSummary
│       ├── state.ts                                     # NEW — getSignupsLastOpenedAt(), markSignupsOpened()
│       ├── queries.ts                                   # NEW — countNewSignups(), listNotificationItems(), getNotificationsSummary()
│       └── mutations.ts                                 # NEW — markAllNotificationsRead()
├── app/
│   ├── api/admin/
│   │   ├── notifications/
│   │   │   ├── route.ts                                 # NEW — GET
│   │   │   └── read/route.ts                            # NEW — POST (mark all as read)
│   │   └── signups/opened/route.ts                      # NEW — POST (Signups list "opened" marker)
│   └── admin/(dashboard)/
│       ├── layout.tsx                                   # MODIFIED — getNotificationsSummary(session.userId) → NotificationsProvider seed
│       ├── page.tsx                                     # MODIFIED — Overview: + requireAdminSession() for userId, + countNewSignups()
│       └── signups/page.tsx                             # MODIFIED — renders <MarkSignupsOpened />
├── components/
│   ├── ui/
│   │   └── popover.tsx                                  # NEW — Base UI Popover wrapper (research §4), shared primitive
│   └── admin/
│       ├── admin-shell.tsx                              # MODIFIED — wraps children in NotificationsProvider + renders PageTitleBadge
│       ├── admin-top-bar.tsx                             # MODIFIED — renders NotificationBell
│       ├── app-sidebar.tsx                              # MODIFIED — reads useNotifications() instead of newMessagesCount prop; + Signups badge
│       ├── app-sidebar.test.tsx                          # MODIFIED — wraps in a NotificationsProvider test double
│       ├── signups/
│       │   └── mark-signups-opened.tsx                  # NEW — "use client", fires POST .../signups/opened once per mount (mirrors mark-read-on-open.tsx)
│       └── notifications/
│           ├── notifications-provider.tsx               # NEW — context, poll/visibility/refresh/markAllRead (research §3)
│           ├── notification-bell.tsx                    # NEW — trigger + Popover.Popup
│           ├── notification-panel.tsx                   # NEW — list / empty state / mark-all-read / footer links
│           ├── notification-badge.tsx                   # NEW — dot-or-count, shared by bell + both sidebar items
│           └── page-title-badge.tsx                     # NEW — "use client", no render output; document.title prefix (research §8)
└── content/
    └── admin.ts                                         # MODIFIED — + notificationsCopy (empty state, mark-all-read, footer links, toasts)

e2e/
├── helpers/notifications.ts                              # NEW — seedAdminNotificationState()
├── admin-notifications-bell.spec.ts                       # NEW — open/list/choose/mark-all-read/empty-state/keyboard
├── admin-notifications-indicators.spec.ts                 # NEW — sidebar badges expanded/collapsed, Overview agreement, 99+
├── admin-notifications-live.spec.ts                       # NEW — immediate refresh after mutation; timer + visibility pause/resume
├── admin-notifications-journey.spec.ts                    # NEW — brief's acceptance sequence end to end
├── admin-notifications-protected.spec.ts                  # NEW — API 401s without a session
└── admin-notifications-visual.spec.ts                     # NEW — 375/768/1024/1440, full-width panel on phone
```

**Structure Decision**: Extends the single Next.js app along
`docs/architecture.md` exactly as 004 and 008 did: models in
`src/models`, domain logic in `src/lib/notifications`, small
general-purpose helpers directly in `src/lib` (`format-count.ts`,
`relative-time.ts` — not feature-namespaced, since nothing about them
is notifications-specific beyond being first needed here), admin routes
under `/api/admin`, new admin UI under `src/components/admin/
notifications`, one new shared primitive under `src/components/ui`,
copy in `src/content/admin.ts`. No new top-level directory.

## Implementation phases (for /sp.tasks)

1. **Foundation** — `models/admin-notification-state.ts`;
   `lib/notifications/{types,state,queries,mutations}.ts` (DB tests:
   lazy-create defaults to now, `countNewSignups` incl. repeat-submission
   counts again and deleted excluded, `listNotificationItems` merge +
   10-cap across kinds, `markAllNotificationsRead` only touches `new`
   messages); `lib/format-count.ts`, `lib/relative-time.ts` (pure unit
   tests); `dal.ts`'s `AdminSession.userId` addition (run the full 002
   session/auth Vitest suite as the regression gate).
2. **Admin routes** — the three routes under
   `/api/admin/notifications*` and `/api/admin/signups/opened` + route
   tests (200/401/503 each).
3. **Shared UI primitive** — `components/ui/popover.tsx` (no
   feature-specific logic; a jsdom smoke test that it opens/closes on
   trigger/Escape/outside-click, mirroring how `dialog.tsx` is
   exercised).
4. **Client state** — `NotificationsProvider` (poll interval,
   visibility pause/resume, `refresh`/`refreshNow`/`markAllRead`) +
   jsdom tests for each behaviour (fake timers, mocked
   `document.visibilityState`, mocked `fetch`).
5. **Bell + panel** — `notification-badge.tsx`, `notification-bell.tsx`,
   `notification-panel.tsx`; wire into `admin-top-bar.tsx`.
6. **Sidebar + title** — `app-sidebar.tsx` (+ test) switched to
   `useNotifications()`, Signups item gains a badge;
   `page-title-badge.tsx`; both wired into `admin-shell.tsx`.
7. **Signups "opened" + layout/Overview wiring** —
   `mark-signups-opened.tsx` wired into the Signups page;
   `layout.tsx`'s `getNotificationsSummary()` seed; Overview page's
   `countNewSignups()` addition.
8. **Copy** — `notificationsCopy` in `src/content/admin.ts`.
9. **E2E + docs** — helper, six Playwright specs, `docs/architecture.md`
   section.

## Follow-ups and risks

- **Single admin today**: `adminNotificationStates` is keyed by admin
  id (not a single global row) even though 002's `user` collection
  currently enforces exactly one admin — this is "don't paint into a
  corner" (Constitution VII), not speculative building; it costs
  nothing extra now and needs no migration if a second admin is ever
  added.
- **Poll interval and scale**: at hundreds of messages/signups a year
  (008/004's own scale assumptions), a ~60-second poll running two
  `countDocuments` and two capped `find` queries per admin session is
  negligible load; if the admin panel is ever opened by many
  simultaneous admins, this is the first place to revisit (e.g.
  lengthening the interval), but is out of scope to pre-optimize for
  now.
- **`document.title` ownership**: `PageTitleBadge` assumes it is the
  only code mutating `document.title` after Next sets it from page
  metadata. If a future feature also manipulates the title directly
  (rather than through `metadata`), the two could fight; documented
  here so that feature's plan re-reads this one.

## Complexity Tracking

Not needed — no constitution violations.

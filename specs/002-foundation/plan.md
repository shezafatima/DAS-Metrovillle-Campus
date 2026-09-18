# Implementation Plan: Foundation

**Branch**: `002-foundation` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-foundation/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Stand up everything later admin features depend on: a cached MongoDB
connection, a Better Auth instance configured for exactly one
email/password admin with public sign-up disabled, a seed command that is
the only way to create or reset that admin, a login page whose failures
are indistinguishable and lock out after repeated attempts (per source
and per account, persisted in MongoDB), a Data Access Layer that every
admin page and `/api/admin/*` route uses to verify the session on the
server, a `proxy.ts` that redirects logged-out visitors to login and
back, and an admin shell (sidebar + top bar, collapsing at `lg`) with
placeholder pages for Overview, News, Messages, Signups and Settings.
Alongside, three tested primitives for features 003–007: a soft-delete
Mongoose plugin, a public-form protection wrapper (DB-backed rate limit +
honeypot), and a detail-free health check. The public site's header and
footer move from the root layout into a `(public)` route-group layout so
the admin area can have its own chrome without a second root layout.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16.3.x (App Router), React 19, Node 24 — already locked; no framework change.
**Primary Dependencies**: **New** (all named in Constitution II, verified compatible in research §1): `better-auth@1.7.5` (Mongo adapter, `nextCookies` plugin, hooks), `mongoose@9.10.1` (pulls `mongodb@~7.6`, the single driver instance shared with Better Auth), `zod@4.6.5` (shared client/server schemas), `@next/env` (already a transitive dependency; declared explicitly for the seed script). **Existing**: Tailwind v4 tokens, shadcn `Button`, `lucide-react` (menu/close/logout icons), `motion` (mobile sidebar drawer, reduced-motion aware), `tsx` (runs the seed script).
**Storage**: MongoDB Atlas Flex via one cached Mongoose connection. Better Auth owns `user`/`session`/`account`/`verification`/`rateLimit`; the app owns `throttle` (login lockout + form rate limit). See data-model.md.
**Testing**: Vitest — unit (lockout arithmetic, honeypot, env schema, safe return path, sidebar active state) and DB-backed integration (seed idempotency incl. concurrent runs, throttle transitions, soft-delete plugin, `/api/admin/session` 401, `/api/health` 503 path, sign-up route refusal) against `dar_e_arqam_test`, skipped with a notice when `MONGODB_URI` is unset. Playwright — one spec per user story (`e2e/admin-*.spec.ts`), seeding the admin in `globalSetup`, layout checks at 375/768/1024/1440.
**Target Platform**: Web, server-rendered; Node.js runtime for `proxy.ts`, route handlers and Server Actions (Better Auth + Mongoose need Node, and Next 16's proxy defaults to it).
**Project Type**: Single existing Next.js app; this feature adds `src/lib/*` infrastructure, `src/models/`, `src/app/admin/**`, `src/app/api/**`, `scripts/seed-admin.ts`, and moves public pages into `src/app/(public)/`.
**Performance Goals**: Login round-trip well under SC-001's 10 s (dominated by one scrypt hash + one Atlas round-trip); `proxy.ts` does cookie-presence checks only (no DB) so it adds no measurable latency to admin navigations; health check bounded by a 2 s ping timeout.
**Constraints**: Constitution III (server-side session check on every admin route; hashed passwords; secrets only in env; public forms rate-limited + honeypot), IV (soft delete by default; email normalised), V (every admin visual value via a named token — two new layout tokens, no new colors), VI (Server Components by default; `"use client"` only on the mobile sidebar toggle and the login form's pending state), VII (the `throttle` collection, soft-delete plugin and DAL are plain server modules a future chatbot service can reuse; nothing assumes the website is the only consumer). Spec: identical wrong-credential responses; lockout persists across restarts; no technical detail in any user-facing error.
**Scale/Scope**: 1 admin, 1 login page, 5 placeholder pages, 1 proxy, 3 route handlers (`/api/auth/[...all]`, `/api/admin/session`, `/api/health`), 1 CLI script, 6 `src/lib` modules, 1 Mongoose model, ~7 Vitest files, 6 Playwright specs, ~12 public page files moved unchanged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Purpose & Fidelity | PASS | The admin area has no das.edu.pk counterpart; spec's "Deviations from the Reference" records this explicitly, so no silent approximation. Public pages are moved, not changed — their fidelity from 001 is untouched (verified by the existing e2e suite continuing to pass). Scope is PRD §6.1/§6.2 + §9 item 2. |
| II. Fixed Stack | PASS | Adds only Better Auth, Mongoose, Zod (all listed in II) at current stable versions; `@next/env` is Next's own package. No new framework, database, or provider. No major-version upgrade of anything installed. |
| III. Security | PASS (drives the plan) | `disableSignUp: true` + seed-only creation; `requireAdminSession()` in every admin page and route handler, never trusting `proxy.ts` alone; scrypt hashing by Better Auth; secrets only via the Zod env schema; `protectPublicForm` delivers the rate-limit + honeypot rule for later forms. |
| IV. Data Integrity | PASS | Shared Zod schemas (`src/lib/validation/`) used by the login form and its Server Action; soft-delete plugin makes `deletedAt` the default; seed script upserts by the natural key (email) behind a unique index; no email is sent. |
| V. Design System | PASS | Admin shell uses existing tokens (`--color-primary`, `--color-surface`, `--color-accent`, `--color-neutral-100`, `--font-heading`, `--font-button`); two new layout tokens (`--spacing-admin-sidebar`, `--spacing-admin-topbar`) are added to `@theme` before use; no arbitrary values. |
| VI. Components | PASS | `AdminSidebar`, `AdminTopBar`, `AdminShell`, `AdminMobileNav`, `LoginForm`, `AdminPlaceholder` each own one visual section; pages compose them; copy in `src/content/admin.ts`. Client code only on the mobile drawer toggle and the form's `useActionState`. |
| VII. Extensibility | PASS | Auth, DAL, throttle and soft-delete are framework-agnostic server modules; `/api/admin/session` is the reference shape for future routes; nothing built for a hypothetical consumer. |
| VIII. Testing & DoD | PASS (planned) | One e2e per user story (6) + unauthorized-access tests for both admin routes + layout at all four breakpoints (Phase 1 test plan below). |

No violations — Complexity Tracking table is not needed.

**Post-design re-check (after Phase 1)**: unchanged. The one design choice
that touched a principle boundary — using Better Auth's internal adapter
(`auth.$context`) in the seed script instead of the `admin` plugin — was
made *for* III/scope (no role fields, no extra user-management endpoints)
and is confined to one script (research §5).

## Project Structure

### Documentation (this feature)

```text
specs/002-foundation/
├── plan.md                        # This file (/sp.plan command output)
├── research.md                    # Phase 0 output — 12 resolved decisions
├── data-model.md                  # Phase 1 output — Better Auth + app collections, throttle state machine, plugin contract
├── quickstart.md                  # Phase 1 output — configure, seed, run, verify
├── contracts/
│   ├── http-and-actions.md        # Server Actions, route handlers, proxy redirects, DAL
│   └── seed-admin-cli.md          # seed command exit codes / outputs / invariants
├── checklists/
│   └── requirements.md            # produced by /sp.specify
└── tasks.md                       # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                          # root: <html>/<body>, fonts, globals.css ONLY (Header/Footer removed)
│   ├── globals.css                         # + --spacing-admin-sidebar, --spacing-admin-topbar tokens
│   ├── not-found.tsx                       # stays at root; now wraps itself in <PublicShell>
│   ├── (public)/
│   │   ├── layout.tsx                      # <PublicShell>{children}</PublicShell>
│   │   ├── page.tsx                        # moved from src/app/page.tsx (git mv, unchanged)
│   │   ├── page.test.tsx                   # moved
│   │   ├── about/…  academics/…  admission/…  campuses/…  contact/…
│   │   ├── hifz-e-quran/…  news/…  portal/…  resources/…   # all moved unchanged
│   ├── admin/
│   │   ├── layout.tsx                      # metadata: robots noindex/nofollow; title template; no visual chrome
│   │   ├── login/
│   │   │   ├── page.tsx                    # server: if getAdminSession() → redirect(/admin); else <LoginForm next=…>
│   │   │   └── actions.ts                  # "use server": login(prevState, formData)
│   │   └── (dashboard)/
│   │       ├── layout.tsx                  # server: session = await requireAdminSession(); <AdminShell email=…>
│   │       ├── actions.ts                  # "use server": logout()
│   │       ├── page.tsx                    # /admin — Overview placeholder
│   │       ├── news/page.tsx               # placeholders; each calls requireAdminSession() itself
│   │       ├── messages/page.tsx
│   │       ├── signups/page.tsx
│   │       └── settings/page.tsx
│   └── api/
│       ├── auth/[...all]/route.ts          # toNextJsHandler(auth)
│       ├── admin/session/route.ts          # GET → 200 {email} | 401
│       └── health/route.ts                 # GET → 200 {status:"ok"} | 503 {status:"unavailable"}
├── proxy.ts                                # matcher /admin/:path*; cookie-presence redirect to /admin/login?next=
├── instrumentation.ts                      # register(): parse env → fail early naming the missing variable
├── components/
│   ├── site-shell/
│   │   └── public-shell.tsx                # NEW: SkipLink + Header + <main id="main-content"> + Footer (extracted from root layout)
│   └── admin/
│       ├── admin-shell.tsx                 # server: grid of sidebar + top bar + content
│       ├── admin-sidebar.tsx               # "use client" (usePathname for active item); renders nav items from content
│       ├── admin-mobile-nav.tsx            # "use client": menu button + drawer (<lg), Escape/close, focus return
│       ├── admin-top-bar.tsx               # server: email + <form action={logout}> Logout button
│       ├── admin-placeholder.tsx           # server: section title + "coming soon" copy
│       └── login-form.tsx                  # "use client": useActionState(login), generic error region, honeypot field
├── content/
│   └── admin.ts                            # nav items (label, href, icon), placeholder copy, error copy
├── lib/
│   ├── env.ts                              # Zod env + seedEnv schemas; getEnv() cached; throws "Missing required environment variable: X"
│   ├── db.ts                               # cached mongoose.connect (global singleton for dev HMR), dbName from env
│   ├── auth.ts                             # betterAuth({...}) per research §4; exports auth
│   ├── login-lockout.ts                    # before/after hook factories (policies: ip 5/15m, email 20/15m, block 15m)
│   ├── dal.ts                              # getAdminSession(), requireAdminSession({mode})
│   ├── rate-limit.ts                       # checkRateLimit({key,max,windowSeconds}) + recordFailure/clear helpers over Throttle
│   ├── honeypot.ts                         # HONEYPOT_FIELD, isHoneypotTripped(formData|json)
│   ├── public-form.ts                      # protectPublicForm(request, opts) → ok | limited | honeypot
│   ├── soft-delete.ts                      # mongoose plugin + statics + withDeleted option
│   ├── log.ts                              # logSecurityEvent({type, ip, email?, outcome}) — structured, no secrets
│   └── validation/
│       ├── login.ts                        # loginSchema
│       └── return-path.ts                  # safeAdminReturnPath(next)
└── models/
    └── throttle.ts                         # Throttle model: key (unique), count, windowStart, blockedUntil, expiresAt (TTL)

scripts/
└── seed-admin.ts                           # per contracts/seed-admin-cli.md; uses auth.$context internal adapter

# package.json: + "seed:admin": "tsx scripts/seed-admin.ts"

# Vitest (colocated)
src/lib/env.test.ts                         # missing var → named error; short password → message
src/lib/validation/return-path.test.ts      # open-redirect cases
src/lib/honeypot.test.ts
src/lib/rate-limit.test.ts                  # [DB] window/threshold/block/TTL transitions, atomic concurrent increments
src/lib/soft-delete.test.ts                 # [DB] hidden by default, withDeleted, restore round-trip
src/lib/login-lockout.test.ts               # [DB] 5 ip failures → blocked; 20 email failures across ips → blocked; success clears
src/app/api/admin/session/route.test.ts     # [DB] 401 without cookie; 200 with seeded session
src/app/api/health/route.test.ts            # ok path; 503 path with ping stubbed to throw; body has no extra keys
src/app/api/auth/sign-up.test.ts            # [DB] POST sign-up/email → 400 EMAIL_PASSWORD_SIGN_UP_DISABLED
scripts/seed-admin.test.ts                  # [DB] create → exists → reset; 10 concurrent runs → 1 user; sessions gone after reset
src/components/admin/admin-sidebar.test.tsx # active item per pathname; exact order

# Playwright (one spec per user story)
e2e/
├── admin-setup.spec.ts                     # US1: seed twice via child_process, assert one admin + outputs (runs serially)
├── admin-login-logout.spec.ts              # US2: success, reload persists, wrong pw/email identical, case-insensitive, login-while-logged-in, logout
├── admin-protected.spec.ts                 # US3: redirect + return to /admin/news; api 401; stale cookie = no session
├── admin-layout.spec.ts                    # US4: no public header/footer; sidebar order/active; top bar email; 375/768 menu button; 1024/1440 sidebar; noindex meta
├── admin-lockout.spec.ts                   # US5: 5 failures → blocked message even with correct password; block survives dev-server restart is covered by the Vitest DB test (restart-independent store), e2e asserts the message
└── admin-primitives.spec.ts                # US6: /api/health ok; /api/auth/sign-up/email 400 (soft delete + form wrapper are Vitest-only — no public route yet)
```

**Structure Decision**: Single existing Next.js app. Two structural moves:
(1) the public shell leaves the root layout for a `(public)` route-group
layout so `admin/` can render its own chrome under the one root layout
(research §3); (2) admin pages split into `admin/login` (bare) and
`admin/(dashboard)` (shell) so the login page is inside the admin
metadata segment but outside the sidebar layout. Everything else is
additive.

## Phase 0 — Research (complete → research.md)

All Technical Context unknowns are resolved; none remain marked NEEDS
CLARIFICATION. Decisions with the widest blast radius:

1. **Route-group split** for public vs admin chrome (§3).
2. **Better Auth config** — sign-up disabled, 12-char minimum, rolling 7-day
   session, DB-backed built-in rate limit as defence-in-depth (§4).
3. **Seed via `auth.$context` internal adapter**, not the admin plugin (§5).
4. **Lockout as Better Auth hooks** so the Server Action and the HTTP route
   share one enforcement point, stored in the app-owned `throttle`
   collection (§6).
5. **One throttle primitive** reused for public-form rate limiting (§7).
6. **Test DB via `MONGODB_DB_NAME`** rather than an in-memory Mongo (§11).

## Phase 1 — Design (complete)

- **data-model.md** — Better Auth collections as they will exist, the
  `throttle` entity with its state machine and atomic update rule, the
  soft-delete plugin contract, and the three Zod schemas.
- **contracts/http-and-actions.md** — `login`/`logout` actions with every
  error branch mapped to spec copy; `/api/admin/session`, `/api/health`,
  `/api/auth/*` expectations; `protectPublicForm` outcomes; `proxy.ts`
  redirect table; DAL signatures.
- **contracts/seed-admin-cli.md** — exit codes, exact stdout lines, side
  effects, invariants.
- **quickstart.md** — configure → seed → run → verify.

### Test plan (maps spec Acceptance → files above)

| Spec acceptance item | Where proven |
|---|---|
| e2e: login, logout, wrong credentials, redirect when logged out, blocked after repeated failures | `admin-login-logout`, `admin-protected`, `admin-lockout` specs |
| Every admin API route rejects unauthorized requests | `session/route.test.ts` (the only admin route this feature adds) + `admin-protected.spec.ts`; pattern documented in contracts for later routes |
| Setup command never creates a second admin | `scripts/seed-admin.test.ts` (sequential + 10 concurrent) |
| Admin layout at 375/768/1024/1440 | `admin-layout.spec.ts` |
| SC-004 identical error text | `admin-login-logout.spec.ts` compares the three error strings byte-for-byte |
| SC-009 no technical detail on DB failure | `health/route.test.ts` asserts body keys; `login` action unit test with `signInEmail` stubbed to throw a MongoError asserts the "unavailable" copy only |
| SC-010 missing env fails fast naming the variable | `env.test.ts`; `seed-admin.test.ts` runs the script with a variable unset and asserts stdout + exit 1 |
| Existing public site unaffected by the move | all `e2e/*.spec.ts` from 001 still pass |

### Implementation sequencing hints for `/sp.tasks`

1. Dependencies + env + db + instrumentation (everything else imports these).
2. `throttle` model + `rate-limit.ts` + `soft-delete.ts` + tests (no auth needed).
3. `auth.ts` + `login-lockout.ts` + `/api/auth` handler + seed script + tests.
4. DAL + `proxy.ts` + `/api/admin/session` + `/api/health` + tests.
5. Public-shell extraction + `(public)` move (run 001 e2e to confirm no regression).
6. Admin shell components + tokens + content + placeholder pages + login page/action.
7. Playwright specs.

## Phase 2 — Task generation

Not part of this command. `/sp.tasks` consumes this plan, data-model.md and
the two contracts.

## Follow-ups and risks

- **Hosting is still "TODO" in `docs/architecture.md`.** `proxy.ts` and
  Better Auth's IP detection depend on which forwarded-IP headers the host
  sets; `advanced.ipAddress.ipAddressHeaders` is configured for the common
  two and must be revisited when hosting is chosen, or per-source lockout
  will key on the proxy's IP.
- **Concurrent-seed test needs a real unique index.** The seed script
  creates it if absent; if Better Auth 1.7's Mongo adapter ever starts
  managing indexes itself, verify there is no conflict.
- **Uncommitted 001 work on this branch.** `002-foundation` was branched
  with all of 001's files still untracked; the `git mv` into `(public)/`
  should happen after 001 is committed so history records a rename, not
  a delete + add.

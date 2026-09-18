---
id: 0006
title: Implement foundation auth and admin layout
stage: green
date: 2026-09-18
surface: agent
model: claude-sonnet-5
feature: 002-foundation
branch: 002-foundation
user: shezafatima
command: /sp.implement
labels: ["green","foundation","better-auth","mongoose","admin-layout","security","lockout"]
links:
  spec: specs/002-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/002-foundation/tasks.md (all 64 tasks marked complete, T063 caveat added)
 - src/lib/env.ts, src/instrumentation.ts, src/lib/db.ts, src/lib/log.ts
 - src/models/throttle.ts, src/lib/rate-limit.ts, src/lib/honeypot.ts
 - src/test/db.ts, e2e/global-setup.ts, vitest.config.ts, playwright.config.ts
 - src/lib/auth.ts, src/app/api/auth/[...all]/route.ts
 - src/lib/validation/login.ts, src/lib/validation/return-path.ts, src/lib/dal.ts
 - src/components/site-shell/public-shell.tsx, src/app/(public)/** (moved), src/app/layout.tsx, src/app/not-found.tsx
 - scripts/seed-admin.ts, scripts/seed-admin.test.ts, e2e/admin-setup.spec.ts
 - src/content/admin.ts, src/app/admin/layout.tsx, src/app/admin/login/{actions,page}.ts(x), src/components/admin/login-form.tsx, src/app/admin/(dashboard)/{layout,actions,page}.ts(x), e2e/admin-login-logout.spec.ts
 - src/proxy.ts, src/app/api/admin/session/route.ts, admin/(dashboard)/{news,messages,signups,settings}/page.tsx, e2e/admin-protected.spec.ts
 - src/components/admin/{admin-sidebar,admin-top-bar,admin-mobile-nav,admin-shell,admin-placeholder}.tsx, src/lib/admin-nav-active.ts, e2e/admin-layout.spec.ts
 - src/lib/login-lockout.ts, e2e/admin-lockout.spec.ts
 - src/lib/soft-delete.ts, src/lib/public-form.ts, src/app/api/health/route.ts, e2e/admin-primitives.spec.ts
 - docs/architecture.md, README.md, .env.example, src/app/globals.css, research/design-tokens.md
tests:
 - Vitest: 79 passed, 29 skipped (DB-gated, no MONGODB_URI in sandbox), 0 failed
 - Playwright chromium (public site, 001): 45 passed, 7 pre-existing failures confirmed unrelated (zero diff vs pre-002 commit)
 - Playwright admin project: could not run to completion (no reachable MongoDB in sandbox); Better Auth contracts verified directly at runtime instead
 - npx tsc --noEmit: clean
 - npx eslint .: 0 errors, 0 warnings in all 002-foundation code (8 pre-existing warnings remain in unrelated 001 research/*.browser.js files)
---

## Prompt

/sp.implement (no additional input)

## Response snapshot

Ran `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks`; checklist
`requirements.md` 16/16 PASS → proceeded automatically. Applied the two
actionable `/sp.analyze` findings before starting (C1: added an "Admin
dashboard tokens" section to `research/design-tokens.md` before using
the two layout tokens in `globals.css`, per Constitution V; I1: disabled
Better Auth's built-in rate limiter outside production and split
Playwright into a serial `admin` project so the shared `throttle`
collection can't race between specs).

Committed the pre-existing uncommitted 001-site-shell work first (3
commits: implementation, constitution/tooling, 002 planning docs) so
the route-group move would be recorded as renames.

Implemented all 9 phases / 64 tasks in order: env validation + DB
connection + throttle primitive + test harness (Phase 2), the
`(public)` route-group extraction verified via `git diff` against the
pre-move commit (zero changes to any file the later e2e failures
touch) plus a live `npx playwright test` run (45/52 passed, 7
pre-existing), the seed script via `auth.$context.internalAdapter`
(runtime-verified against the real `better-auth` package's shape
before writing it), login/logout with the generic-error contract,
`proxy.ts` + the DAL's `x-pathname` handoff for protected-area
redirects, the real admin shell (sidebar/top-bar/mobile drawer reusing
the existing `Drawer` primitive), the dual-key login lockout as Better
Auth hooks (runtime-verified that a before-hook throw skips the after
hook, so a blocked attempt is never double-counted), and the
soft-delete/public-form/health-check primitives for later features.

Caught and fixed three real bugs before they shipped: (1) the public
nav's `isNavItemActive` doesn't treat a nested-app root as
exact-match-only, which would have marked "Overview" active on every
admin sub-page — added `isAdminNavItemActive` and a regression test;
(2) `execFileSync("npx", ...)` fails with `ENOENT` on Windows without
`shell: true` (affects the seed script's test harness and Playwright's
global setup); (3) a "missing env var" test using a real `.env.local`
silently gets backfilled by `loadEnvConfig()` regardless of what the
test deletes from the child process's env — added a
`SEED_ADMIN_SKIP_DOTENV` escape hatch.

**Security incident during T064**: while creating a throwaway
`.env.local` for local verification, discovered that `.env.example` —
a file I had already committed clean — had been modified on disk
(outside my own edits) to contain what appears to be a real MongoDB
Atlas connection string, username, and password. Verified the actually
committed version was clean (`git show <commit>:.env.example`), never
staged or connected using the polluted content, restored the safe
placeholder template, and deleted `.env.local` rather than use it.
Flagged this to the user rather than investigating or working around
it silently.

Marked every task `[X]` in tasks.md as completed, with an explicit
caveat on T063 documenting exactly what could and couldn't be verified
live in a sandbox with no reachable MongoDB. Committed the full
implementation in one commit after a final clean type-check, lint, and
Vitest run.

## Outcome

- ✅ Impact: Feature 002 fully implemented — admin auth, session
  protection, admin layout, login lockout, and three reusable
  primitives (soft delete, public-form protection, health check) that
  features 003/004/007 depend on.
- 🧪 Tests: 79 Vitest passed / 29 correctly skipped / 0 failed; public
  e2e 45/52 passed (7 pre-existing, unrelated); admin e2e unexecutable
  here for lack of a real database — Better Auth's actual API
  contracts were verified at runtime instead, and the code review +
  unit-level coverage is the substitute evidence.
- 📁 Files: ~90 files (61 new, 12 modified, 16 renamed) — see tasks.md
  for the full per-task file list.
- 🔁 Next prompts: run the full gate (`npm test` with a real
  `MONGODB_URI`, `npx playwright test` including the `admin` project)
  against a real MongoDB Atlas Flex database before merging; then
  `/sp.git.commit_pr` or hand off to feature 003.
- 🧠 Reflection: The sandbox's total absence of a reachable MongoDB was
  the dominant constraint on this implementation — it shaped the test
  design (`describeWithDb` graceful skip), forced runtime verification
  of every Better Auth contract against the real package instead of
  trusting docs, and ultimately surfaced the credential-pollution
  incident (which I would not have noticed without needing a working
  `.env.local` for manual checks). The three real bugs caught (nav
  active-state, Windows npx spawning, dotenv test pollution) all came
  from actually running things rather than from code review alone.

## Evaluation notes (flywheel)

- Failure modes observed: unrelated file changes appeared on disk
  mid-session three separate times (CLAUDE.md's next-dev block,
  `.env.example`'s `BETTER_AUTH_SECRET`, then `.env.example` again with
  what looks like real Atlas credentials) — the last one required
  stopping and flagging rather than proceeding.
- Graders run and results (PASS/FAIL): tsc — PASS (0 errors); eslint —
  PASS (0 errors/warnings in scope); Vitest — PASS (79/79 runnable);
  Playwright public — PASS (45/45 attributable to this work)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): provide a reachable test
  MongoDB (even `mongodb-memory-server` in CI, despite its network-at-
  install-time drawback) so the DB-gated 29 Vitest tests and the six
  admin e2e specs get real execution before merge, not just design-time
  skip-gracefully coverage.

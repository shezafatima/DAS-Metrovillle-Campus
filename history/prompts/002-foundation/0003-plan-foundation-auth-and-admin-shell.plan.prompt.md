---
id: 0003
title: Plan foundation auth and admin shell
stage: plan
date: 2026-09-18
surface: agent
model: claude-opus-5
feature: 002-foundation
branch: 002-foundation
user: shezafatima
command: /sp.plan
labels: ["plan","foundation","better-auth","mongoose","admin-layout","security"]
links:
  spec: specs/002-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/002-foundation/plan.md
 - specs/002-foundation/research.md
 - specs/002-foundation/data-model.md
 - specs/002-foundation/contracts/http-and-actions.md
 - specs/002-foundation/contracts/seed-admin-cli.md
 - specs/002-foundation/quickstart.md
 - CLAUDE.md (agent-context script run; BOM stripped, no content change)
tests:
 - none run (plan stage); test plan defined in plan.md mapping every spec acceptance item to a Vitest or Playwright file
---

## Prompt

/sp.plan (no additional input), followed by "continue" after the plan artifacts were written.

## Response snapshot

Ran `setup-plan.ps1 -Json`; loaded spec, constitution, `docs/architecture.md`,
the installed Next.js 16 docs (proxy, authentication, not-found,
serverExternalPackages, metadata robots, environment-variables), the current
`src/app` tree, and verified Better Auth 1.7.5 behaviour against its docs and
the downloaded package tarball (sign-up.ts / sign-in.ts sources, `$context`,
internal adapter methods, `nextCookies`, `getSessionCookie`, hook dispatch for
server-side `auth.api` calls, rate-limiter semantics). Checked npm for
compatible versions: better-auth 1.7.5, mongoose 9.10.1 (mongodb ~7.6), zod 4.6.5.

**research.md** — 12 decisions: dependency versions; Next 16 conventions
(`proxy.ts` on Node runtime, DAL enforcement not layouts, root `not-found`
must stay at root); route-group split `(public)` + `admin/(dashboard)`;
Better Auth config (disableSignUp, minPasswordLength 12, expiresIn 7d /
updateAge 1d rolling, DB-backed built-in rate limit as defence-in-depth,
nextCookies plugin); seeding via `auth.$context` internal adapter rather than
the admin plugin (avoids role fields / extra endpoints); dual-key lockout as
Better Auth before/after hooks so the Server Action and HTTP route share one
enforcement point, persisted in an app-owned `throttle` collection; same
primitive reused for public-form rate limiting; soft-delete Mongoose plugin;
detail-free health check; Zod env validation in `instrumentation.ts`; test DB
via `MONGODB_DB_NAME` instead of mongodb-memory-server; admin visuals from
existing tokens plus two layout tokens.

**data-model.md** — Better Auth collections as they will exist, `throttle`
entity with policy table and state machine, atomic `$inc` upsert rule,
soft-delete plugin contract, three Zod schemas, `safeAdminReturnPath` rule.

**contracts/** — every login/logout branch mapped to spec copy;
`/api/admin/session`, `/api/health`, `/api/auth/*` expectations;
`protectPublicForm` outcomes; `proxy.ts` redirect table; DAL signatures;
seed CLI exit codes / stdout / invariants.

**plan.md** — Technical Context, Constitution Check (all PASS, re-checked
post-design), full source tree incl. the `(public)` move and 11 Vitest + 6
Playwright files, acceptance→test mapping, sequencing hints, 3 risks
(hosting-dependent IP headers, unique-index ownership, uncommitted 001 work
before the `git mv`).

`update-agent-context.ps1 -AgentType claude` ran; this repo's CLAUDE.md has no
SpecKit tech markers so it added nothing but a BOM, which was stripped.

## Outcome

- ✅ Impact: Feature 002 fully designed; all NEEDS CLARIFICATION resolved with verified sources; ready for `/sp.tasks`.
- 🧪 Tests: none run; plan defines 11 Vitest files (7 DB-backed) and 6 Playwright specs, each tied to a spec acceptance item.
- 📁 Files: plan.md, research.md, data-model.md, contracts/http-and-actions.md, contracts/seed-admin-cli.md, quickstart.md
- 🔁 Next prompts: `/sp.adr` for the three significant decisions (suggested below), then `/sp.tasks`
- 🧠 Reflection: The two findings that most changed the design came from reading source rather than docs — `disableSignUp` also blocks server-side `signUpEmail` (forcing the `$context` seed path) and `auth.api.*` calls run the hook pipeline (making hooks the right place for the lockout so the HTTP route cannot bypass it).

## Evaluation notes (flywheel)

- Failure modes observed: `update-agent-context.ps1` reports success while writing only a BOM when CLAUDE.md lacks its markers.
- Graders run and results (PASS/FAIL): Constitution Check — PASS (8/8), pre- and post-design
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

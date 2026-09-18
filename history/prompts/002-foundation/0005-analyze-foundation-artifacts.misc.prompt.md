---
id: 0005
title: Analyze foundation artifacts
stage: misc
date: 2026-09-18
surface: agent
model: claude-opus-5
feature: 002-foundation
branch: 002-foundation
user: shezafatima
command: /sp.analyze
labels: ["analyze","foundation","consistency","constitution"]
links:
  spec: specs/002-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - none (read-only analysis; no files modified)
tests:
 - none
---

## Prompt

/sp.analyze (no additional input)

## Response snapshot

Ran `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks`; all
artifacts present. Cross-checked spec.md (34 FR, 10 SC, 6 stories),
plan.md, tasks.md (64 tasks) and the constitution.

Findings (13): 1 CRITICAL, 2 HIGH, 5 MEDIUM, 5 LOW.

- **C1 CRITICAL** (Constitution V): the two admin layout tokens are added
  to `globals.css` but not to `research/design-tokens.md`, which the
  principle names as the token source; spec says V applies in full.
  Fix = amend T004.
- **I1 HIGH**: e2e specs share one source IP and persisted `throttle`
  rows; with `fullyParallel: true` and T016's forced
  `rateLimit.enabled: true`, lockout/rate-limit state leaks between specs
  → flaky. Fix = library-default rate limit enable, serial Playwright
  project for `admin-*`, `clearThrottle()` in every admin spec.
- **A1 HIGH**: SC-004's timing clause is unmeasurable and untested.
- MEDIUM: rolling expiry semantics (`updateAge` once/day) and untested
  (U1); reset-with-no-admin case absent from T024/T025 (U2);
  `environmentMatchGlobs` no longer exists in Vitest 5 (U3); expired
  session page path not proven (U4); LoginForm not stated to reuse
  `loginSchema` per Constitution IV (I2).
- LOW: entity name drift Login attempt record/Throttle (I3); plan test
  list stale (I4); logout log lacks ip (I5); sign-up 400 asserted twice
  (D1); new-tab and all-public-pages assertions missing (U5);
  placeholder titles hard-coded vs content (U6).

Coverage: 34/34 FRs mapped (100%), 7 partial. No unmapped tasks.
Offered remediation suggestions for the top 6; nothing applied.

## Outcome

- ✅ Impact: Surfaced one constitution gap and one test-flakiness design flaw before implementation, both cheap to fix at the task level.
- 🧪 Tests: none
- 📁 Files: none modified
- 🔁 Next prompts: apply remediation edits to tasks.md (T004, T014–T016, T024, T025, T030, T032, T040, T046) and spec.md (SC-004, Assumptions), then `/sp.implement`
- 🧠 Reflection: The parallel-e2e/shared-throttle interaction (I1) only became visible by reading the Playwright config alongside the lockout tasks — cross-artifact analysis earned its keep here.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): coverage mapping — PASS (100% FR coverage); constitution check — 1 CRITICAL (C1)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

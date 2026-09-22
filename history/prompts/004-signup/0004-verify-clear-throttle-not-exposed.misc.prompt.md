---
id: 0004
title: Verify clearThrottle not exposed
stage: misc
date: 2026-09-22
surface: agent
model: claude-opus-5
feature: 004-signup
branch: 004-signup
user: shezafatima
command: none (free-form request)
labels: ["security", "rate-limit", "e2e", "verification"]
links:
  spec: specs/004-signup/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/004-signup/research.md (boundary note added to §8)
tests:
 - none (static verification via grep/tsconfig)
---

## Prompt

Confirm clearThrottle() cannot be reached in production. If it is
exposed through any route, restrict it to the test environment only.

## Response snapshot

Verified by search and config inspection, no code change needed:

- `clearThrottle()` is defined only in `e2e/global-setup.ts:73` and
  imported only by `e2e/admin-lockout.spec.ts`. No `src/` or
  `scripts/` file imports it.
- `tsconfig.json` excludes `e2e/`; Next bundles only what `src/app`
  routes reach, so the function is not in the production build.
- The only app-code deletion on the `throttle` collection is
  `clearKeys()` (`src/lib/rate-limit.ts:136`), called solely from
  `src/lib/login-lockout.ts:65` to reset one account's own lockout
  counters after a successful login — intended 002 behaviour, not a
  reset surface. `src/test/db.ts` is test-only.

Added a "Boundary (verified)" paragraph to research.md §8 so the 004
tasks keep throttle resets out of any route/action/page.

## Outcome

- ✅ Impact: Confirmed no production exposure; constraint recorded for implementation.
- 🧪 Tests: none.
- 📁 Files: specs/004-signup/research.md
- 🔁 Next prompts: `/sp.tasks`
- 🧠 Reflection: tsconfig `exclude` plus import-graph reachability is the decisive check, not just grep for route files.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

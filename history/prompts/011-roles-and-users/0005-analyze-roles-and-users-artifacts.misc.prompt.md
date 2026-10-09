---
id: 0005
title: Analyze roles and users artifacts
stage: misc
date: 2026-09-29
surface: agent
model: claude-opus-5-5
feature: 011-roles-and-users
branch: 011-roles-and-users
user: shezafatima
command: /sp.analyze
labels: ["analyze", "consistency", "coverage"]
links:
  spec: specs/011-roles-and-users/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - (read-only; none modified)
tests:
 - none
---

## Prompt

/sp.analyze (no arguments)

## Response snapshot

Read-only analysis of spec.md, plan.md, tasks.md, contracts and the constitution. 0 CRITICAL, 2 HIGH, 7 MEDIUM, 5 LOW.
- HIGH U1: the unique email index is created only by the seed script, so the Vitest DB suites (and any DB where the seed never ran) lack it; T039's concurrent-create test and Constitution VI's database-enforced uniqueness depend on it.
- HIGH I1: T021 folds `password_change_required` into `forbidden`, which contradicts contracts/access-matrix.md.
- MEDIUM: Users nav item not added until US3 (T055), although US1 delivers the page; "Careers" checkbox vs "Signups" nav label; plan.md structure/E2E list out of date vs tasks (8 specs, login-gate.ts, set-password-form.tsx); a single Access key can't express news-or-settings for uploads (future 005); ADR role-permissions-model still missing; set-password disabled-mid-flow edge case untested; searchParams is async in Next 16 (T059).
- LOW: SC-001/SC-002 timing measured only manually; FR-029 origin check untested (framework built-in); FR-017 last-changed time untested; US2 scenario 5 (temp still works after logout) not asserted; FR-011/FR-026 overlap.
- Verified in code: markAllNotificationsRead currently sets every new message to read for any caller, confirming T056 is needed.
- Coverage: 35/35 FRs have tasks; 7/9 SCs have automated tasks; 42/44 overall (95%).

## Outcome

- ✅ Impact: No blockers; 2 HIGH fixes recommended before /sp.implement
- 🧪 Tests: none
- 📁 Files: none modified
- 🔁 Next prompts: approve remediation edits; /sp.adr role-permissions-model; /sp.implement
- 🧠 Reflection: The index finding came from checking the real test helpers, not the artifacts alone.

## Evaluation notes (flywheel)

- Failure modes observed: check-prerequisites.ps1 not executed (classifier gave no verdict)
- Graders run and results (PASS/FAIL): constitution alignment PASS (no MUST violations)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

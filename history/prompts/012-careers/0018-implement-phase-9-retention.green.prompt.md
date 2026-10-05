---
id: 0018
title: Implement Phase 9 retention sweep
stage: green
date: 2026-10-05
surface: agent
model: claude-sonnet-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: move on / continue
labels: ["implement","careers","retention","sweep"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/lib/careers/retention.ts
 - src/lib/careers/retention.test.ts
 - src/app/api/public/careers/route.ts
 - src/app/api/public/careers/route.test.ts
 - src/app/admin/(dashboard)/careers/page.tsx
 - scripts/sweep-careers.ts
 - package.json
 - specs/012-careers/tasks.md
tests:
 - src/lib/careers/retention.test.ts + public careers route test (29 pass)
---

## Prompt

move on

(then) continue (after the Atlas IP allow-list problem was fixed by the user)

## Response snapshot

T082-T085: sweepCareerApplications (expired live or soft-deleted, failed removals retried, pending over 1 h cleared; a record is dropped only after its file is gone; batches of 100), maybeSweepCareers gated by sweep:careers once an hour and never throws, after() hooks on the public success path and the admin Applications page, npm run sweep:careers. Route test mocks next/server after (it only works inside a request) and asserts the sweep is scheduled only after a success. DB tests first failed because the Atlas cluster refused this network's IP; they passed once it was allowed.

## Outcome

- Impact: retention is automatic (Constitution V); Phase 9 complete.
- Next prompts: Phase 10 signup removal (needs backup first), Phase 11 polish and release gate
- Reflection: script not run against the dev database.

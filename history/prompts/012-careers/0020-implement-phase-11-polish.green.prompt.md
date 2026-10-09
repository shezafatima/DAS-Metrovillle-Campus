---
id: 0020
title: Implement Phase 11 polish and verify
stage: green
date: 2026-10-06
surface: agent
model: claude-sonnet-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: continue / yes fix it and continue / go
labels: ["implement","careers","release-gate","docs","verification"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - scripts/check-release-content.ts
 - scripts/check-release-content.test.ts
 - package.json
 - docs/architecture.md
 - specs/011-roles-and-users/contracts/access-matrix.md
 - specs/012-careers/quickstart.md
 - specs/012-careers/tasks.md
tests:
 - scripts/check-release-content.test.ts (5 pass); home and content unit tests (25 pass)
 - npm run build (exit 0, run alone, release gate printed its warning)
 - Playwright forms 38/38 (4 cold-compile failures passed on warm rerun); admin-careers + admin-careers-access 16/16 on a warm rerun; shell-careers-links 13/13; access matrix: careers cases pass, one /admin/settings case timed out (not careers)
 - RUN_BLOB_INTEGRATION=1 vercel-blob.integration.test.ts: 5/5 against the real private store
---

## Prompt

continue
(then) is it done (with the user's loose-ends notes pasted)
yes fix it and continue
go

## Response snapshot

T100: release gate (prebuild; fails only with VERCEL_ENV=production while the privacy notice is a placeholder or CAREERS_RETENTION_MONTHS is unset; warns otherwise). T093/T094/T101 docs (architecture.md rewritten for careers, 011 access matrix, quickstart section 4). T099 security self-check by grep and tests: no blob import outside src/lib/documents, no cv.key in any DTO, download headers present, local driver refused in production, window constant only in rules.ts. The build was blocked by a type error in the user's uncommitted partners-carousel (satisfies narrowed the Partner href away); fixed in src/content/home.ts (as Partner[]), typecheck clean, build passes. Real Blob store test ran (not skipped) and passed 5/5. T098 (manual width walkthrough) left open.

## Outcome

- Impact: 012 is implemented and verified except T098, the signup backup + retire run, the merge to main and client confirmations.
- Next prompts: backup then retire:signups --confirm; T098 walkthrough; commit 006 files together with signup removal; merge 012; then 006 E2E and 007.
- Reflection: admin E2E failures in the first run were cold compiles on a slow dev server; rerunning warm passed.

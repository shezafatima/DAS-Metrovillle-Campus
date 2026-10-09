---
id: 0013
title: Implement reapply window and blob test
stage: green
date: 2026-10-03
surface: agent
model: claude-sonnet-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: none (direct request)
labels: ["implement","careers","reapply-window","locks","vercel-blob","integration-test"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0008-career-application-30-day-reapply-window.md
  pr: null
files:
 - src/lib/careers/identity-lock.ts
 - src/lib/careers/identity-lock.test.ts
 - src/lib/careers/mutations.ts
 - src/lib/careers/mutations.test.ts
 - src/lib/careers/mutations-window.test.ts
 - src/app/api/public/careers/route.ts
 - src/app/api/public/careers/route.test.ts
 - src/lib/documents/vercel-blob.integration.test.ts
 - e2e/careers-public.spec.ts
 - specs/012-careers/tasks.md
 - specs/012-careers/quickstart.md
tests:
 - src/lib/careers/identity-lock.test.ts (11, DB)
 - src/lib/careers/mutations.test.ts (5, DB)
 - src/lib/careers/mutations-window.test.ts (14, DB, incl. 10 simultaneous submissions)
 - src/app/api/public/careers/route.test.ts (DB)
 - e2e/careers-public.spec.ts (13, forms project)
---

## Prompt

yes, continue with Phase 4, but do the real Blob test first.

(a stray message "kkkkm" arrived mid-run and was treated as an accidental keystroke)

## Response snapshot

Real Blob test: no Blob credentials exist on this machine (none in .env.local or the environment, no Vercel CLI, no linked project), so it could not be run. Wrote `src/lib/documents/vercel-blob.integration.test.ts`, which runs only with RUN_BLOB_INTEGRATION=1 and BLOB_READ_WRITE_TOKEN (against a throwaway private store): round trip, exact key and no overwrite, anonymous URL fetch refused (401/403), bad token mapped without leaking. Confirmed it skips cleanly; documented the command in quickstart §4. Phase 4 (US2) implemented: per-identity locks (conditional upsert on a hashed unique _id, sorted acquisition, 2 s wait, owner-only release, abandoned work keeps its lease), window check under the locks, RecentApplicationError / StaleUploadError / LockBusyError mapped to 409 with reapplyFrom or 503 try_again, form already handled 409. Tests: all DB suites pass, incl. 10 simultaneous submissions sharing an email and sharing a phone → exactly one saved. E2E 13/13: same email and same phone both refused with the identical message and date, accepted after a 30-day backdate with both records kept, soft-deleted applicant not blocked. tsc clean for project files (remaining errors are the user's uncommitted 006 partners-carousel and a generated .next-e2e file); eslint clean.

## Outcome

- ✅ Impact: The 30-day rule is enforced under concurrency; the feature can now be released safely as far as US1+US2 go. The real Blob test is ready but waiting for a token.
- 🧪 Tests: see list above
- 📁 Files: see list above
- 🔁 Next prompts: user adds a throwaway private Blob store token and runs the integration command; then Phase 5 (US3 private download)
- 🧠 Reflection: my first lock tests used fixed sleeps and were flaky on a remote database; replaced with a started-signal and a zero-wait probe.

## Evaluation notes (flywheel)

- Failure modes observed: tests that depend on timing against Atlas; an older test file not clearing the new locks collection; heredoc quoting failure (used Write)
- Graders run and results (PASS/FAIL): vitest DB PASS, playwright PASS (13/13), tsc PASS (project files), eslint PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

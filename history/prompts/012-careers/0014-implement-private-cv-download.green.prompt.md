---
id: 0014
title: Implement private CV download
stage: green
date: 2026-10-03
surface: agent
model: claude-sonnet-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: none (direct request)
labels: ["implement","careers","private-download","access-matrix","us3"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0007-private-document-store-vercel-blob.md
  pr: null
files:
 - src/app/api/admin/careers/[id]/cv/route.ts
 - src/app/api/admin/careers/[id]/cv/route.test.ts
 - src/lib/careers/cv-download.ts
 - src/lib/careers/download-name.ts
 - src/lib/careers/download-name.test.ts
 - src/lib/careers/key-unguessable.test.ts
 - src/lib/careers/rules.ts
 - src/lib/log.ts
 - src/test/access-inventory.test.ts
 - src/app/api/admin/access-matrix.test.ts
 - e2e/admin-careers-access.spec.ts
 - specs/012-careers/tasks.md
tests:
 - src/lib/careers/download-name.test.ts (8)
 - src/lib/careers/key-unguessable.test.ts (3, DB)
 - src/app/api/admin/careers/[id]/cv/route.test.ts (6, DB)
 - src/test/access-inventory.test.ts and src/app/api/admin/access-matrix.test.ts (incl. the new route's three cases)
 - e2e/admin-careers-access.spec.ts (3, admin project)
---

## Prompt

continue Phase 5,

## Response snapshot

Implemented US3 (T045–T051). `GET /api/admin/careers/[id]/cv`: requireAdminAccess("careers") first; lookup (stored, not deleted; malformed, unknown, pending and deleted ids all 404); stream from the document store; headers Content-Type application/pdf, Content-Disposition attachment with a generated cv-<ascii name>-<PKT date>.pdf, Content-Length, nosniff, CSP sandbox, Cache-Control private, no-store; missing object logs only the application id (career_cv_missing); store failure 503. Added `cvDownloadName` (ASCII slug, 40 chars, "applicant" fallback, injection-proof), `pktDateString`, three log event types. Registered the route in the access inventory and the three-case matrix. Tests: key never derives from id, name, email, phone, qualification, dates or the uploaded file name, and two identical applications get different keys; route tests for every 404 case, 503, headers and body; E2E proves no session 401, content manager without careers 403, with careers a PDF attachment, and that the file is not reachable at /<key> or /.data/... Fixed two test/type issues found on the way (a test that wrongly flagged the key's own .pdf suffix; a null-safety type error). All pass; tsc clean for project files; eslint clean.

## Outcome

- ✅ Impact: CVs can be fetched only by a signed-in admin with the careers permission, as a download.
- 🧪 Tests: see list above
- 📁 Files: see list above
- 🔁 Next prompts: Phase 6 (US4 admin list, detail, delete, export, notifications), the largest phase (25 tasks)
- 🧠 Reflection: the classifier hiccuped once on file writes; retrying as-is worked.

## Evaluation notes (flywheel)

- Failure modes observed: transient auto-mode classifier no-verdict; first full-project tsc under load took over 10 minutes
- Graders run and results (PASS/FAIL): vitest PASS, access matrix PASS, playwright admin PASS (3/3), tsc PASS, eslint PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

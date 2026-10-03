---
id: 0012
title: Implement careers phases 1 to 3
stage: green
date: 2026-10-03
surface: agent
model: claude-sonnet-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: /sp.implement
labels: ["implement","careers","vercel-blob","cv-upload","top-bar"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0007-private-document-store-vercel-blob.md, history/adr/0008-career-application-30-day-reapply-window.md
  pr: null
files:
 - package.json
 - package-lock.json
 - .gitignore
 - .env.example
 - src/lib/env.ts
 - src/lib/env.test.ts
 - src/lib/documents/types.ts
 - src/lib/documents/store.ts
 - src/lib/documents/local.ts
 - src/lib/documents/vercel-blob.ts
 - src/lib/documents/store.test.ts
 - src/test/fake-document-store.ts
 - src/lib/csv.ts
 - src/lib/csv.test.ts
 - src/lib/signup/csv.ts
 - src/lib/careers/rules.ts
 - src/lib/careers/rules.test.ts
 - src/lib/careers/cv-limits.ts
 - src/lib/careers/cv-limits.test.ts
 - src/lib/careers/read-capped-body.ts
 - src/lib/careers/mutations.ts
 - src/lib/careers/mutations.test.ts
 - src/lib/careers/route-errors.ts
 - src/lib/validation/career-application.ts
 - src/lib/validation/career-application.test.ts
 - src/models/career-application.ts
 - src/models/career-application-lock.ts
 - src/content/careers.ts
 - src/content/site-shell.ts
 - src/components/careers/careers-intro.tsx
 - src/components/careers/careers-form.tsx
 - src/components/careers/careers-form-section.tsx
 - src/components/careers/careers-form.test.tsx
 - src/components/site-shell/top-bar.test.tsx
 - src/app/(public)/careers/page.tsx
 - src/app/api/public/careers/route.ts
 - src/app/api/public/careers/route.test.ts
 - e2e/careers-public.spec.ts
 - e2e/helpers/careers.ts
 - e2e/fixtures/cv-valid.pdf
 - e2e/fixtures/cv-renamed.pdf
 - e2e/global-setup.ts
 - playwright.config.ts
 - research/design-tokens.md
 - specs/012-careers/tasks.md
tests:
 - src/lib/env.test.ts (23)
 - src/lib/documents, careers rules/cv-limits, validation, csv (86 across 7 files)
 - src/components/careers/careers-form.test.tsx (13)
 - src/lib/careers/mutations.test.ts + src/app/api/public/careers/route.test.ts (DB, 19)
 - src/content + src/components/site-shell (41)
 - e2e/careers-public.spec.ts (11, forms project)
 - e2e/contact-and-social.spec.ts top-bar test
---

## Prompt

/sp.implement also add the carrer page link in the top yellow bar

(Re-run after an interrupted tool call and a model switch, with no arguments:)

/sp.implement

## Response snapshot

Implemented phases 1–3 (T001–T036) plus T043 and the top-bar part of T077, as agreed; stopped there for review. Phase 1: @vercel/blob, env vars (driver defaults to local outside production; Blob credentials required only in production; local refused in production), .gitignore, .env.example. Phase 2: DocumentStore (types, local, vercel-blob, fake), shared CSV encoder lifted, rules (30-day window constant, PKT math), CV limits (4 MiB, %PDF- and %%EOF checks), shared Zod schema, careers copy, models (applications with non-unique lookup indexes; identity-lock model), route errors, fixtures, E2E helpers and config. Phase 3: insert-first-pending mutation with a seam for the US2 window, capped body reader (no stream cancel, so the 413 is delivered), public POST route, form, intro, form band, page, DB tests, route tests, form tests, E2E spec. The Careers link is the first item in the yellow top bar. No careers page exists on das.edu.pk (404), so styling reuses contact tokens (noted in design-tokens.md). Verified: all unit/DB/component tests pass, 11/11 careers E2E at 4 widths, tsc clean for project code (only a generated .next-e2e file errors), eslint clean after two fixes. Known: five stale footer-shape E2E failures from feature 001, unchanged. Not done: US2 locks and window (the app must not be released before it), US3 download, admin, notifications, footer link, retention, signup removal, release-gate script.

## Outcome

- ✅ Impact: Visitors can apply with a CV and the file is stored privately; the form is live at /careers and linked from the top bar.
- 🧪 Tests: all new tests pass; see list above
- 📁 Files: see list above
- 🔁 Next prompts: review, then continue with Phase 4 (US2 window and locks), which must land before any release
- 🧠 Reflection: the machine's slow disk and a stray dev server caused repeated Vitest worker start timeouts; --environment=node and retrying warm resolved it. vercel-blob.ts is type-checked only and needs a real-store check before go-live.

## Evaluation notes (flywheel)

- Failure modes observed: Vitest 60 s worker-start timeout under memory pressure; undici unhandled rejection from cancelling a request body stream (fixed by not cancelling)
- Graders run and results (PASS/FAIL): vitest PASS, playwright careers PASS (11/11), tsc PASS (project files), eslint PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

---
id: 0003
title: Static books and skip signup specs
stage: green
date: 2026-10-01
surface: agent
model: claude-opus-5-5
feature: 006-home-page
branch: 006-home-page
user: shezafatima
command: (direct request)
labels: ["home","books","signup","e2e"]
links:
  spec: specs/006-home-page/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - e2e/signup-public.spec.ts, e2e/signup-visual.spec.ts (file-level skip)
 - src/content/home.ts (books.covers ×10), src/components/home/books-carousel.tsx, src/app/(public)/page.tsx
 - public/images/home/books/README.txt
 - removed: src/lib/settings/groups/books.ts, books.test.ts, admin settings/books page, e2e/admin-home-books.spec.ts, 006 contracts books-settings-group.md + access-matrix.md
 - reverted books additions in settings types/registry/public, cloudinary, sign route (+test), admin copy, access inventory, roles matrix, settings e2e helpers/specs, 011 access matrix
 - e2e/admin-home-page.spec.ts, admin-home-layout.spec.ts, e2e/helpers/home.ts
 - specs/006-home-page/{spec,plan,research,data-model,quickstart,tasks}.md, contracts/home-sections.md, checklist; docs/architecture.md
tests:
 - vitest: 8 files, 91/91 pass; tsc clean; eslint clean (1 pre-existing warning)
---

## Prompt

Skip signup-public and signup-visual with a comment referencing
012-careers. Keep the admin signup and API tests running. No
test-only page. okay my final decision for books are a carousel in in real website with total 10 hardcoded images that will be not dynamic i will add the book pics in public/ later by myself

## Response snapshot

- Both public signup specs now skip at file level, with a comment pointing to 012-careers. The admin signup specs and the API/route tests are untouched.
- Books are now static: 10 fixed covers in `src/content/home.ts` (`public/images/home/books/book-01.jpg` … `book-10.jpg`), shown in the reference carousel.
- Missing files are skipped. With none present the section hides. In dev the check runs on every render, so new files appear without a restart.
- The Settings Books group was removed everywhere: code, tests, admin page, access rows and specs.

## Outcome

- ✅ Impact: books static per final decision; signup public specs parked until 012
- 🧪 Tests: vitest 91/91 on touched areas; E2E still pending
- 📁 Files: see above
- 🔁 Next prompts: add the 10 cover files; run the E2E suites
- 🧠 Reflection: confirm the admin-vs-static choice for content before building the admin side.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): vitest PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

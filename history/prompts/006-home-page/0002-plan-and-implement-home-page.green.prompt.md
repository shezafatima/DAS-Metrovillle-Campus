---
id: 0002
title: Plan and implement home page
stage: green
date: 2026-10-01
surface: agent
model: claude-opus-5-5
feature: 006-home-page
branch: 006-home-page
user: shezafatima
command: done first we cover the whole home 006 then move on to the test
labels: ["home","settings-books","carousel","tokens","news-cache"]
links:
  spec: specs/006-home-page/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/006-home-page/ (spec, plan, research, data-model, contracts, quickstart, tasks, checklist)
 - research/extract-home-tokens.ts(+browser.js), research/extract-home-details.ts(+browser.js), research/tokens/home-*.json, research/design-tokens.md
 - public/images/home/** (20 reference assets), public/images/og-home.png
 - src/app/globals.css, src/content/home.ts, src/app/(public)/page.tsx
 - src/components/home/* (13 components + 3 tests)
 - src/lib/settings/groups/books.ts, types.ts, registry.ts, public.ts, books.test.ts; src/content/admin.ts; src/lib/cloudinary.ts; settings sign route (+test)
 - src/app/admin/(dashboard)/settings/books/page.tsx
 - src/lib/news/latest.ts (+test), public-queries.ts, 4 admin news routes
 - src/lib/e2e-fresh-reads.ts, playwright.config.ts, src/lib/gallery/migrate.ts
 - e2e/admin-home-page.spec.ts, admin-home-books.spec.ts, admin-home-layout.spec.ts, e2e/helpers/home.ts
 - src/app/(public)/page.test.tsx (deleted; replaced by components/home/careers-cta.test.tsx)
tests:
 - vitest: home components 9/9; books/settings/news/access DB run 241/242 (1 Atlas timeout, re-run alone 4/4 pass)
 - playwright: written, not run (memory)
---

## Prompt

done first we cover the whole home 006 then move on to the test

(Answers during the turn: reference section order; commit 007 then build 006 on top; one snapshot commit of everything. Mid-turn: "also as I mention that I want book section hardcoded but want book images handle from the admin panel".)

## Response snapshot

The working tree was snapshot-committed as 54b6fac and 006-home-page was re-pointed at it.

Spec changes:
- Clarifications resolved: reference order, the "Why Choose" name, and the Resources anchors from 007.
- The Books section is now in scope, with fixed content and admin-managed covers in a new Settings group (US9, FR-034 to FR-037).

Plan:
- Plan, research (R1 to R11), data model, three contracts, quickstart, and 36 tasks.

Implementation:
- A live token extraction of das.edu.pk (two passes), 20 reference assets, and a "Home sections (006)" token chapter.
- The Books group in the 005 engine.
- `listLatestPosts` with a cached, never-throwing `getLatestPosts`, revalidated on every admin news write.
- Typed `home.ts` content, a shared scroll-snap Carousel, and 12 section components.
- The new page with SectionBoundary, metadata, and an og image.
- A generalized `E2E_FRESH_READS` switch.

Tests:
- Unit and DB tests pass.
- The E2E specs are written but not run.

## Outcome

- ✅ Impact: home page built end to end; books covers admin-managed
- 🧪 Tests: unit/DB green; E2E pending (T012, T015, T018, T020, T022, T024, T026, T028, T030, T032, T033, T035, T036)
- 📁 Files: see above
- 🔁 Next prompts: run the E2E suites once memory allows; decide where the 004 signup E2E specs go now that the form left `/`
- 🧠 Reflection: SectionBoundary first wrapped `<Section />` JSX (not caught); fixed by awaiting the section function.

## Evaluation notes (flywheel)

- Failure modes observed: an edit script double-applied a replacement in the news [id] route (fixed); a remote DB timeout flake
- Graders run and results (PASS/FAIL): vitest PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

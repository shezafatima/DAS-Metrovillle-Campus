---
id: 0005
title: Generate academics tasks
stage: tasks
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 018-academics
branch: 018-academics
user: shezafatima
command: /sp.tasks
labels: ["tasks", "academics", "video-embed", "redirects", "placeholders"]
links:
  spec: specs/018-academics/spec.md
  ticket: null
  adr: history/adr/0010-shared-click-to-load-video-block.md
  pr: null
files:
 - specs/018-academics/tasks.md
tests:
 - none (task generation only)
---

## Prompt

/sp.tasks

## Response snapshot

Generated specs/018-academics/tasks.md with 60 tasks, in the 017 format, with tests first in every phase:
- Setup T001–T004: copy the docx files, extract the .txt references, add teachers-training.txt from the live page, README and folders.
- Foundational T005–T014: 3 tokens; move the field helpers to src/lib/content/fields.ts and placeholdersAllowed to src/lib/content-mode.ts; src/lib/video/embed.ts (Instagram parser, resolveVideo); the Academics schemas; pageSections.academics and legacyAcademicsRedirects.
- US1 T015–T029 (MVP): content, fidelity and component tests, the e2e US1 test, 4 content files, index, resolve, 3 section components, page.
- US2 T030–T034: menu and search E2E, removal of the old anchors.
- US3 T035–T037: page-sections redirects and the next.config legacy map.
- US4 T038–T046: the shared VideoEmbed, the home switch (delete youtube-embed.tsx), the e2e-academics-media seam, wiring, the no-request E2E, the owner URL request.
- US5 T047–T053: trainingPhotoTiles, the TrainingPhotos collage, the dev/prod/fixture E2E, the owner photo request.
- Polish T054–T060: layout and axe at 4 widths × 3 modes, client-review.md, lint/tsc, npm test, a build static check, the full public E2E (sequenced after the build), and the manual check with Instagram screenshots.

## Outcome

- ✅ Impact: tasks.md is ready for /sp.implement. The MVP is US1 + US2. Don't deploy before US3, because next.config still derives wrong redirects.
- 🧪 Tests: none run (planning stage).
- 📁 Files: specs/018-academics/tasks.md
- 🔁 Next prompts: /sp.analyze, then /sp.implement
- 🧠 Reflection: T014 changes pageSections in Foundational, so the menu is right as soon as the page exists. The redirect fix is a separate story (US3), so the deploy note matters.

## Evaluation notes (flywheel)

- Failure modes observed: The create-phr bash script is absent, so the agent-native PHR was used.
- Graders run and results (PASS/FAIL): checklist format PASS; every story has tests plus an independent test PASS; file paths on every task PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

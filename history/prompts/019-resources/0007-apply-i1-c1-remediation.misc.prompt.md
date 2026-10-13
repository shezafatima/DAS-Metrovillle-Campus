---
id: 0007
title: Apply I1 and C1 remediation
stage: misc
date: 2026-10-13
surface: agent
model: claude-opus-5-5
feature: 019-resources
branch: 019-resources
user: shezafatima
command: none
labels: ["resources", "analyze", "remediation", "accessibility", "search"]
links:
  spec: specs/019-resources/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/019-resources/spec.md
 - specs/019-resources/tasks.md
tests:
 - none run
---

## Prompt

Yes, apply I1 and C1 too

## Response snapshot

- I1 (spec.md US1 scenario 4 and FR-017): the example accessible name is now "Download for Android: Scarlet English (opens in a new tab)". FR-017 states that the visible label stays in the name (WCAG 2.5.3, research R3), and that a replacement name such as "Download Scarlet English app" is not used.
- C1 (tasks.md T021): the search check moved to `src/lib/site-search.test.ts`. The `searchIndex` entries with `parentLabel: "Resources"` are exactly Photo Gallery and Mobile Apps in order, and no href contains `#downloads` or `#our-books`. I checked `flatten()` in `src/lib/site-search.ts`, which sets `parentLabel` for child entries.

## Outcome

- ✅ Impact: All six medium-severity analysis findings are resolved; G1–G4 are deferred to implementation.
- 🧪 Tests: None run.
- 📁 Files: spec.md, tasks.md
- 🔁 Next prompts: /sp.implement
- 🧠 Reflection: Reading `buildSearchIndex` before writing the assertion confirmed that `parentLabel` is the right field to filter on.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

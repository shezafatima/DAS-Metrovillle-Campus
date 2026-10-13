---
id: 0005
title: Analyze Resources artifacts
stage: misc
date: 2026-10-13
surface: agent
model: claude-opus-5-5
feature: 019-resources
branch: 019-resources
user: shezafatima
command: /sp.analyze
labels: ["resources", "analyze", "consistency", "coverage"]
links:
  spec: specs/019-resources/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - none (read-only analysis)
tests:
 - none run
---

## Prompt

/sp.analyze (no additional user input)

## Response snapshot

Read-only cross-check of spec.md, plan.md and tasks.md against the constitution and the code. 0 CRITICAL, 0 HIGH, 6 MEDIUM, 5 LOW. Coverage 28/28 FRs have at least one task (100%); a few have weak verification (FR-005 gallery at 768/1024, FR-019 button alignment, FR-026 line length, photo-fails-to-load edge case).
Main points: US1 scenario 4 / FR-017 example name "Download Scarlet English app" conflicts with research R3's label-in-name decision; T021 puts the search check in the wrong file (search is built in src/lib/site-search.ts from navigationItems); T017 uses a bracket value and an untokenised transition duration, and its colour transition ignores reduced motion (FR-020); the photo-fails-to-load edge case has no concrete frame and no test; the composed tokens and US4's doc-only test are documented only in plan.md, not as spec-level deviations; nothing re-checks the FR-006 redirects (existing e2e/page-sections.spec.ts covers them).
Recommended: may proceed to /sp.implement after small tasks.md/spec.md edits; offered concrete remediation.

## Outcome

- ✅ Impact: Found no blocking issues; listed small fixes to make before implementing.
- 🧪 Tests: None run.
- 📁 Files: None modified.
- 🔁 Next prompts: Approve remediation edits, then /sp.implement
- 🧠 Reflection: Checking task paths against the code (site search source, AnchoredPage reuse on /admission) found issues the documents alone would not show.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

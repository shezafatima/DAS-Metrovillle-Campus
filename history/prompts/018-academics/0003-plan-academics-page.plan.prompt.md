---
id: 0003
title: Plan academics page
stage: plan
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 018-academics
branch: 018-academics
user: shezafatima
command: /sp.plan
labels: ["plan", "academics", "video-embed", "redirects"]
links:
  spec: specs/018-academics/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/018-academics/plan.md
 - specs/018-academics/research.md
 - specs/018-academics/data-model.md
 - specs/018-academics/quickstart.md
 - specs/018-academics/contracts/academics-content.md
 - specs/018-academics/contracts/page-structure.md
 - specs/018-academics/spec.md
tests:
 - none (planning only)
---

## Prompt

/sp.plan (no arguments)

## Response snapshot

Planned /academics as three Server Component sections (Academic Overview, Teachers' Training, Hifz-e-Quran) built on 017's patterns:
- Zod content files under src/content/academics, in 014's shape, with a fidelity test against committed .txt extractions.
- pageSections.academics reduced to 3 ids, and an explicit legacyAcademicsRedirects map in next.config.ts.
- The home YouTubeEmbed generalised into a shared VideoEmbed (YouTube and Instagram; local posters only on Academics, so no provider requests before the click).
- trainingPhotoTiles decides between collage, single photo, placeholders and nothing. The dev/production seam is extracted to src/lib/content-mode.ts.
- 3 new tokens. A test-only media cookie for E2E.
- Added a "Deviation from the Reference Site" note to spec.md (Constitution I). The constitution check passes. Suggested an ADR for the shared video block.

## Outcome

- ✅ Impact: The design artifacts are ready for /sp.tasks.
- 🧪 Tests: none run (planning)
- 📁 Files: plan, research, data-model, quickstart, 2 contracts; spec deviation note
- 🔁 Next prompts: /sp.adr shared-click-to-load-video-block (optional), /sp.tasks
- 🧠 Reflection: The id change makes derived redirects wrong (the same problem as 017), so an explicit map is required. The empty media needed a test seam to keep US4 and US5 testable in a browser.

## Evaluation notes (flywheel)

- Failure modes observed: The update-agent-context script found no language line in the plan's bullet format (warning only).
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

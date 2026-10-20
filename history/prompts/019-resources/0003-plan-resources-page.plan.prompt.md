---
id: 0003
title: Plan Resources page
stage: plan
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 019-resources
branch: 019-resources
user: shezafatima
command: /sp.plan
labels: ["resources", "plan", "mobile-apps", "gallery", "accessibility"]
links:
  spec: specs/019-resources/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/019-resources/plan.md
 - specs/019-resources/research.md
 - specs/019-resources/data-model.md
 - specs/019-resources/quickstart.md
 - specs/019-resources/contracts/mobile-apps-content.md
 - specs/019-resources/contracts/page-structure.md
 - specs/019-resources/spec.md
 - history/prompts/019-resources/0003-plan-resources-page.plan.prompt.md
tests:
 - none (planning stage)
---

## Prompt

/sp.plan

## Response snapshot

Planned 019 against the 017/018 patterns, with a constitution check that passes before and after design. Key decisions (research R1–R15):
- A dead app link is `url: ""` (018's video rule). Dead reference URLs live only in the source record and the client-review document.
- `linkMatchesType` validates Play, App Store and https direct links, and refuses http and look-alike hosts.
- The accessible name keeps the visible button text (WCAG 2.5.3): "{button}: {app} (opens in a new tab)". The APK note is linked with aria-describedby.
- `AboutSection` gains optional `beside`/`below` props so the Mobile Apps heading sits in the text column beside the flyer.
- `GallerySection` is re-wrapped in `AboutSection`. Hidden-when-empty stays, and no 007 E2E spec asserts the old h2 markup.
- The photo turned out to be a text flyer dated 2020-21, so it is shown uncropped (new token `--size-resources-flyer-max-h`) with transcribed alt text. FR-012 was updated and finding R7 added.
- Fixed backgrounds: Photo Gallery surface, Mobile Apps muted. New token `--spacing-resources-card-lift`.
- E2E: gallery-dependent order and anchor tests go in an admin-project spec (gallery seeding). Two page-sections tests are adjusted. The release check is unchanged.
No ADR is warranted.

## Outcome

- ✅ Impact: Plan and design artifacts ready for /sp.tasks.
- 🧪 Tests: none (planning stage)
- 📁 Files: plan, research, data-model, quickstart, 2 contracts, spec update (R7)
- 🔁 Next prompts: /sp.tasks
- 🧠 Reflection: Viewing the reference photo changed the plan. A crop-and-short-alt approach would have hidden the flyer's text.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): constitution check — PASS (pre and post design)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

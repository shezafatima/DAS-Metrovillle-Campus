---
id: 0001
title: Specify home page feature
stage: spec
date: 2026-09-30
surface: agent
model: claude-opus-5-5
feature: 006-home-page
branch: 006-home-page
user: shezafatima
command: /sp.specify
labels: ["home-page", "spec", "hero", "news", "progress-dashboard"]
links:
  spec: specs/006-home-page/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/006-home-page/spec.md
 - specs/006-home-page/checklists/requirements.md
 - history/prompts/006-home-page/0001-specify-home-page-feature.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

Feature Brief — 006 Home Page (pasted by the user mid-turn; full text as in the /sp.specify input above): the public home page built from the reference and fed by Settings (hero slides, stats, video URL) and News (latest posts), with static content-file sections (quick-access cards, inspiration, salient features, careers CTA, icon quick-links, partners), reference section order, books carousel and Franchise card left out, acceptance by E2E tests and screenshot match at 375/768/1024/1440px.

## Response snapshot

Created branch `006-home-page` (from 005-settings; 005 work still uncommitted) and wrote spec.md: 8 user stories (hero, sections, news, careers CTA, dashboard, quick-links, partners, SEO), 33 FRs, 10 SCs, deviations table. Screenshot names resolved to das.edu.pk_.png / (iPad Pro) / (Moto G Power). Two [NEEDS CLARIFICATION] markers: (1) the brief's order (Who We Are third) differs from the reference (Inspiration, then Why Choose with the video) and the section is named differently; (2) the brief's "anchors fixed in the site shell spec" for Photo/Videos, Downloads, Our Books do not exist. Defaults recorded: six news cards, ~2 s count-up (reference duration unreadable), hero pauses on hover/focus, `/careers` shows the placeholder page until 012.

## Outcome

- ✅ Impact: Spec drafted; blocked on 2 clarifications before /sp.plan
- 🧪 Tests: none
- 📁 Files: spec.md, checklists/requirements.md, this PHR
- 🔁 Next prompts: answer Q1 and Q2, then /sp.clarify or /sp.plan
- 🧠 Reflection: the brief's own "follow the reference and note the difference" rule was applied as the default, but Constitution I still requires flagging conflicts

## Evaluation notes (flywheel)

- Failure modes observed: brief referenced spec anchors that were never written
- Graders run and results (PASS/FAIL): checklist 15/16 (open clarifications)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

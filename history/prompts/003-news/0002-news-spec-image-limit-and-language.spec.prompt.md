---
id: 0002
title: News spec image limit and language field
stage: spec
date: 2026-09-21
surface: agent
model: claude-opus-5
feature: 003-news
branch: 003-news
user: shezafatima
command: /sp.specify (follow-up)
labels: ["news", "spec", "urdu", "images"]
links:
  spec: specs/003-news/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-news/spec.md
 - specs/003-news/checklists/requirements.md
 - history/prompts/003-news/0002-news-spec-image-limit-and-language.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

Cover image limit: 5 MB, to match the site-wide image limit.

 ,

Add a language field to each news post: English or Urdu (default
English). An Urdu post displays right-to-left with the Urdu font in
the admin editor, the admin list, the public list card and the
detail page, including title, excerpt and body. Mixed English words
inside Urdu text still display correctly. Search in the admin list
works with Urdu titles.

## Response snapshot

- FR-023 and Assumptions: cover image limit changed from 10 MB to
  5 MB (site-wide image limit).
- User Story 5 rewritten around an explicit per-post language field
  (English/Urdu, default English) with 7 acceptance scenarios: default
  value, editor switches direction while typing, RTL + Urdu font in
  all four places for title/excerpt/body, English words inside Urdu
  text, English posts LTR, admin search matches Urdu titles, Urdu
  addresses still valid.
- FR-001 gains the language field; FR-028–FR-030 now define the
  language field, where it governs direction/font, and mixed-word plus
  search behaviour; former FR-030–FR-035 renumbered FR-031–FR-036.
- Key Entities and SC-006 updated accordingly.
- Checklist updated (validation 2). Categories (Q1) still awaiting the
  user's answer.

## Outcome

- ✅ Impact: Spec now records the site-wide image limit and a deliberate language model instead of auto-detection.
- 🧪 Tests: none (spec stage).
- 📁 Files: spec.md, checklists/requirements.md, this PHR.
- 🔁 Next prompts: answer Q1 (categories) → `/sp.clarify` or `/sp.plan`.
- 🧠 Reflection: An explicit language field is simpler to test and explain than per-paragraph detection; the user's change removed an ambiguity the spec had papered over with an assumption.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): spec quality checklist — PASS except the open categories marker.
- Prompt variant (if applicable): none.
- Next experiment (smallest change to try): none.

---
id: 0004
title: Plan home page
stage: plan
date: 2026-10-01
surface: agent
model: claude-opus-5-5
feature: 006-home-page
branch: 006-home-page
user: shezafatima
command: /sp.plan
labels: ["plan","home","books-static","carousel"]
links:
  spec: specs/006-home-page/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/006-home-page/plan.md (regenerated from template)
 - specs/006-home-page/research.md (R11 testing updated)
 - CLAUDE.md (agent context update)
tests:
 - none (plan stage)
---

## Prompt

/sp.plan (no arguments)

## Response snapshot

Ran setup-plan (which reset plan.md to the template; the earlier draft was backed up to the scratchpad) and regenerated the plan against the final spec:
- Data sources: Settings (hero, stats, video), News (`listLatestPosts` with 60 s cache and tag revalidation), and the typed `home.ts` content, including the 10 static book covers.
- Constitution check: all PASS, with no new admin entry points.
- Research: R11 corrected to the actual E2E files and the `E2E_FRESH_READS` switch.
- Data model, contracts and quickstart: already consistent with the static books.
- Agent context updated (that step was skipped in the earlier unreviewed draft).
- No ADR suggested.

## Outcome

- ✅ Impact: 006 plan formally produced via /sp.plan
- 🧪 Tests: none
- 📁 Files: plan.md, research.md, CLAUDE.md
- 🔁 Next prompts: /sp.tasks, then /sp.analyze, /sp.implement
- 🧠 Reflection: the plan now matches the code that already exists; /sp.tasks should mark what's done vs pending.

## Evaluation notes (flywheel)

- Failure modes observed: setup-plan overwrites plan.md without warning (backed up first)
- Graders run and results (PASS/FAIL): constitution check PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

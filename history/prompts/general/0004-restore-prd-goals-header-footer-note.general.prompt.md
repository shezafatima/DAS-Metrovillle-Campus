---
id: 0004
title: Restore PRD goals and header footer note
stage: general
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: none
branch: 009-admin-notifications
user: s2636309@gmail.com
command: none
labels: ["prd", "docs"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - docs/prd.md
tests:
 - none
---

## Prompt

Restore both. Goals list as it was, but change the third goal to
"Let staff publish news and edit page content without developer
help." Restore the shared header/footer note in §4 unchanged.

## Response snapshot

Restored the "Goals:" bullet list under §1 Overview in `docs/prd.md`, keeping the first two goals unchanged and updating the third to "Let staff publish news and edit page content without developer help." Restored the "Shared on every public page: header ... and footer ..." note in §4 Sitemap verbatim, placed after the admin route list.

## Outcome

- ✅ Impact: `docs/prd.md` §1 and §4 now match the user's intended content after the v0.3 rewrite; nothing lost between drafts.
- 🧪 Tests: none (documentation-only change)
- 📁 Files: `docs/prd.md`
- 🔁 Next prompts: none
- 🧠 Reflection: Flagging omissions instead of silently dropping or silently reinstating them (per PHR 0003) let the user make a quick, precise call instead of me guessing.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a (documentation change)
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

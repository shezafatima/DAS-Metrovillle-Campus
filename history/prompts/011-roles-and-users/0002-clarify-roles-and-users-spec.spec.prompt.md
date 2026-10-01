---
id: 0002
title: Clarify roles and users spec
stage: spec
date: 2026-09-29
surface: agent
model: claude-opus-5-5
feature: 011-roles-and-users
branch: 011-roles-and-users
user: shezafatima
command: /sp.clarify
labels: ["clarify", "roles", "permissions", "access-control"]
links:
  spec: specs/011-roles-and-users/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/011-roles-and-users/spec.md
 - specs/011-roles-and-users/checklists/requirements.md
tests:
 - none (specification stage)
---

## Prompt

/sp.clarify (no arguments)

Answers given during the session, in order: "recomended", "yes", "yes", "yes".

## Response snapshot

Asked 4 questions, all answered with the recommended option:
1. More than one main admin? → Yes; main admin can create/promote/demote other main admins; at least one active main admin always remains (FR-022 updated, assumption removed).
2. Permission for the existing Signups list? → `careers` key now, Careers after 012; no `signups` key (FR-006 updated, assumption removed).
3. Deleted user's email reused? → Restore as a brand-new pending account; nothing from before carries over except change-record history (edge case updated).
4. Response to a forbidden request? → Uniform 403 with no data for missing permission or wrong role, incl. main-admin-only areas; 401 unchanged; closed raw auth routes still 404 (FR-009 updated).
Added `## Clarifications / ### Session 2026-09-29`. Checklist notes updated.

## Outcome

- ✅ Impact: Four security/scope ambiguities resolved; spec ready for /sp.plan
- 🧪 Tests: none
- 📁 Files: spec.md, checklists/requirements.md
- 🔁 Next prompts: /sp.plan; /sp.adr role-permissions-model
- 🧠 Reflection: Remaining open items (session-check mechanism, storage of grants) are plan-level.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): no NEEDS CLARIFICATION markers; 4 clarification bullets, no duplicates — PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

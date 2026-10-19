---
id: 51
title: Plan dynamic sections 014b
stage: plan
date: 2026-10-19
surface: agent
model: claude-opus-5-5
feature: 014b-dynamic-sections
branch: 014b-dynamic-sections
user: shezafatima
command: /sp.plan
labels: ["plan","settings-groups","syllabi","class-levels","portal-links","seed-scripts","migration"]
links:
  spec: specs/014b-dynamic-sections/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/014b-dynamic-sections/plan.md
 - specs/014b-dynamic-sections/research.md
 - specs/014b-dynamic-sections/data-model.md
 - specs/014b-dynamic-sections/quickstart.md
 - specs/014b-dynamic-sections/contracts/panel-actions.md
 - specs/014b-dynamic-sections/contracts/access-matrix.md
 - specs/014b-dynamic-sections/contracts/public-sections.md
 - specs/014b-dynamic-sections/contracts/scripts.md
 - specs/014b-dynamic-sections/spec.md
 - history/prompts/014b-dynamic-sections/51-plan-dynamic-sections.plan.prompt.md
tests:
 - none (planning stage)
---

## Prompt

/sp.plan (no arguments)

Answers given during planning, verbatim (AskUserQuestion):
- Syllabi fit: "Add optional paragraph (Recommended)"
- Exam layout: "Cards per brief"

## Response snapshot

Read slice 1's plan, research and contracts and the settings engine (types, schema, items, mutations, panels, panel form, list editor), the registration availability path, the header, footer, About view pattern, `next.config.ts` redirects and the access inventory. Compared the reference screenshots and the live syllabi page with the brief. Found two conflicts and asked the user about both: (1) the reference syllabi contain prose and extra sub-headings (Play Group is general admission info), so each topic group gets an optional intro; (2) the reference Examination is stacked, but the brief wants cards, which the user confirmed as a recorded deviation. The spec was updated (2 clarifications, a "Deviations from the reference" subsection, FR-010/015/017/052, Key Entities).

Decisions (research R1–R17):
- **Storage**: four new 005 Settings groups saved through 014's `savePanel` (ADR candidate).
- **Engine additions**: `lines` and `dayMonth` fields, URL `rejectCredentials`/`warnInsecure`/`testLink`, a `maxTotalLines` rule (3,000-topic cap for the 16 MB document limit), and per-list `maxDeletedRetained`.
- **Nested lists**: soft delete at the top level only.
- **Checklist**: `levelId` added to the admission `classes` items. Legacy names read as "not linked" and stay offered, a server cross-check refuses deleted levels, and the migration is optional and idempotent.
- **Pending flag**: `pendingConfirmation` sits outside `data`, cleared by `confirmSettingsPanel`/`confirmPagesPanel`.
- **Seeding**: one seed runner over typed data files, with an adaptation report.
- **Public site**: a dynamic-sections resolver for the page, menu and search; ARIA tabs with per-level hash links; a table plus a stacked list for Class Levels; footer links from Settings with reflow; `/portal/*` → `/`.

Contracts: panel actions, access matrix, public sections and scripts. Constitution Check passes before and after design. The agent context script ran, but CLAUDE.md had no markers to update (no change).

## Outcome

- ✅ Impact: Plan and Phase 0/1 artifacts complete; ready for /sp.tasks.
- 🧪 Tests: none (planned in R17)
- 📁 Files: plan, research, data-model, quickstart, 4 contracts; spec updated
- 🔁 Next prompts: /sp.adr dynamic-sections-as-settings-groups (if approved), then /sp.tasks
- 🧠 Reflection: The brief's limits multiply past MongoDB's document limit; a total cap was added and recorded in the spec.

## Evaluation notes (flywheel)

- Failure modes observed: update-agent-context.ps1 reported success but changed nothing in CLAUDE.md (no markers).
- Graders run and results (PASS/FAIL): Constitution Check PASS (pre and post design)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

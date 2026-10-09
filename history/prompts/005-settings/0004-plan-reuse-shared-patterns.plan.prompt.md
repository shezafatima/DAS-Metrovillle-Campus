---
id: 0004
title: Plan reuse of shared patterns
stage: plan
date: 2026-09-30
surface: agent
model: claude-opus-5-5
feature: 005-settings
branch: 005-settings
user: shezafatima
command: /sp.plan
labels: ["settings", "plan", "reuse", "field-definitions", "contact-seed"]
links:
  spec: specs/005-settings/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/005-settings/plan.md
 - specs/005-settings/research.md
 - specs/005-settings/contracts/field-definitions.md
 - history/prompts/005-settings/0004-plan-reuse-shared-patterns.plan.prompt.md
tests:
 - none (planning stage)
---

## Prompt

Each settings group is defined
as a list of typed fields, and the admin form is generated from that
definition rather than hand-built per group. Reuse the shared form,
table, dialog, upload and right-panel patterns from earlier
features. Header, footer and Contact page read from Settings, seeded
with their current content-file values.

## Response snapshot

The plan from the previous /sp.plan run already had definition-driven forms and contact defaults taken from the content file. setup-plan.ps1 was not re-run because it would overwrite plan.md with the blank template. Added a "Reuse Map" to plan.md covering form, table, dialog, upload, right panel and access, with the existing piece, how Settings uses it, and any change to the shared piece. Two lifts are needed: (1) split AdminDeleteDialog into AdminConfirmDeleteDialog (confirm only, because settings deletes are staged until Save) plus the existing request-making wrapper; (2) move the sign → direct-upload helpers and image limits out of CoverImageField into src/lib/uploads/, and generalise cloudinary.ts by folder. Hero slides use the shared Table at ≥ md and cards below, the same split as 011's users list. The slide editor is the 011 Sheet with UserPanel close rules. The "seed" is defaults imported from contactInfo, applied on read when a group has never been saved, so no seed script is needed. Updated research R12 and the field-definitions contract, and corrected the form primitive names to the real exports (FormMessage, FormDescription).

## Outcome

- ✅ Impact: Plan names each shared pattern it reuses and the two small lifts it needs
- 🧪 Tests: none (plan stage)
- 📁 Files: plan.md, research.md, contracts/field-definitions.md
- 🔁 Next prompts: /sp.tasks; optionally /sp.adr settings-field-definition-model
- 🧠 Reflection: AdminDeleteDialog makes the DELETE request itself, which doesn't fit the save-the-whole-group model, so it has to be split

## Evaluation notes (flywheel)

- Failure modes observed: re-running setup-plan.ps1 would have wiped the existing plan; avoided
- Graders run and results (PASS/FAIL): constitution check unchanged, PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

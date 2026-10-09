---
id: 0003
title: Plan settings feature
stage: plan
date: 2026-09-30
surface: agent
model: claude-opus-5-5
feature: 005-settings
branch: 005-settings
user: shezafatima
command: /sp.plan
labels: ["settings", "plan", "field-definitions", "caching", "cloudinary", "optimistic-concurrency"]
links:
  spec: specs/005-settings/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/005-settings/plan.md
 - specs/005-settings/research.md
 - specs/005-settings/data-model.md
 - specs/005-settings/quickstart.md
 - specs/005-settings/contracts/access-matrix.md
 - specs/005-settings/contracts/settings-actions.md
 - specs/005-settings/contracts/field-definitions.md
 - CLAUDE.md
 - history/prompts/005-settings/0003-plan-settings-feature.plan.prompt.md
tests:
 - none (planning stage)
---

## Prompt

/sp.plan (no arguments)

## Response snapshot

Wrote plan, research (R1–R13), data model, three contracts and quickstart for 005-settings. Key decisions: definition-driven groups (one generic form + schemaFor + defaultsFor); `settings` collection with one document per group (`_id` = key) and a version compare-and-set save (refuses stale saves per clarification 2); list-item soft delete inside the group document; public reads via `unstable_cache` (60 s, tags, `updateTag` on save) with a 3 s timeout and last-good/defaults fallback, `cacheComponents` left off; reuse 003's signed direct Cloudinary upload through a new settings-scoped sign route plus on-save verification; up/down buttons primary with native drag (no new dependency); one URL per group so `useUnsavedChanges` covers switching; save through a Server Action gated by `requireAdminAccess("settings")`. The contact defaults are imported from `contactInfo`, so the site is unchanged on release. Constitution check all PASS (fidelity flags recorded). Agent context updated.

## Outcome

- ✅ Impact: Design artifacts ready for /sp.tasks
- 🧪 Tests: none (plan stage); test layout defined in quickstart
- 📁 Files: plan.md, research.md, data-model.md, quickstart.md, contracts/*, CLAUDE.md
- 🔁 Next prompts: /sp.adr settings-field-definition-model; /sp.tasks
- 🧠 Reflection: Next 16 docs steer to `use cache` + cacheComponents; chose legacy `unstable_cache` to avoid a project-wide rendering change, isolated behind one function.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): constitution check PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

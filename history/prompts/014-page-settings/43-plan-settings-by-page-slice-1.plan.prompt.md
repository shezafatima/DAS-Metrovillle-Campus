---
id: 43
title: Plan settings by page slice 1
stage: plan
date: 2026-10-17
surface: agent
model: claude-opus-5-5
feature: 014-page-settings
branch: 014-page-settings
user: shezafatima
command: /sp.plan
labels: ["settings", "permissions", "compare-and-set", "plan", "slice-1"]
links:
  spec: specs/014-page-settings/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/014-page-settings/plan.md
 - specs/014-page-settings/research.md
 - specs/014-page-settings/data-model.md
 - specs/014-page-settings/quickstart.md
 - specs/014-page-settings/contracts/panel-actions.md
 - specs/014-page-settings/contracts/access-matrix.md
 - specs/014-page-settings/contracts/tabs-and-panels.md
 - specs/014-page-settings/spec.md
 - CLAUDE.md
tests:
 - none (planning stage)
---

## Prompt

/sp.plan (no additional input)

## Response snapshot

Planned slice 1 from the code: static tab folders (site-wide, home, admission, resources; About/Academics/Careers have no route yet); a pure tab/panel registry over the 005 groups; admission split into three panels saving only their own fields, guarded by a per-panel fingerprint (SHA-256 of the panel's stored fields) and written by the existing group-version compare-and-set with ≤3 retries; `saveSettingsGroup` replaced by `saveSettingsPanel` (settings) and `savePagesPanel` (pages) so the access inventory proves each panel's permission; new access value `settings_or_pages` for the Admission tab, Settings index and sidebar; hero/video/stats/admission messages/gallery/upload signer move to Pages; read-only panels via `<fieldset disabled>`; one unsaved-changes guard per tab; button-disclosure panels with a sticky header row; six `next.config.ts` redirects; three home fragment ids; additive `panelSaves` for per-panel "last saved"; `settings_saved` log gains `panel`; idempotent `npm run grant:pages` (conditional `$addToSet`, change-record entry only on real change) run before deploy. Forbidden page outcome stays 011's `/admin?denied=1` (no experimental `forbidden()`). Constitution check all PASS. Spec edge case and US2 scenario 5 aligned with the design.

## Outcome

- ✅ Impact: plan, research (R1–R15), data model, 3 contracts and quickstart ready for /sp.tasks
- 🧪 Tests: none run (planning); test plan in research R15
- 📁 Files: see list above
- 🔁 Next prompts: /sp.adr admission-panels-partial-save; then /sp.tasks
- 🧠 Reflection: fingerprint-per-panel avoids both false conflicts between sibling panels and silent overwrites that a client-side version hand-off would allow

## Evaluation notes (flywheel)

- Failure modes observed: first panel markup sketch made the whole panel sticky; corrected to a sticky header row with a button disclosure
- Graders run and results (PASS/FAIL): Constitution Check — PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

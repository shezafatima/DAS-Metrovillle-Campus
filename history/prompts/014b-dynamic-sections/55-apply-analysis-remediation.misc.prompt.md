---
id: 55
title: Apply analysis remediation 014b
stage: misc
date: 2026-10-19
surface: agent
model: claude-opus-5-5
feature: 014b-dynamic-sections
branch: 014b-dynamic-sections
user: shezafatima
command: remediation of /sp.analyze findings
labels: ["analyze","remediation","change-record","breakpoints"]
links:
  spec: specs/014b-dynamic-sections/spec.md
  ticket: null
  adr: history/adr/0014-dynamic-sections-as-settings-groups.md
  pr: null
files:
 - specs/014b-dynamic-sections/spec.md
 - specs/014b-dynamic-sections/research.md
 - specs/014b-dynamic-sections/data-model.md
 - specs/014b-dynamic-sections/plan.md
 - specs/014b-dynamic-sections/contracts/panel-actions.md
 - specs/014b-dynamic-sections/contracts/public-sections.md
 - specs/014b-dynamic-sections/quickstart.md
 - specs/014b-dynamic-sections/tasks.md
 - history/adr/0014-dynamic-sections-as-settings-groups.md
 - history/prompts/014b-dynamic-sections/55-apply-analysis-remediation.misc.prompt.md
tests:
 - none (documentation only)
---

## Prompt

Message 1 (verbatim):

Yes, suggest concrete fixes for C1, I1, I2, D1 and the LOW items, and
show them before applying.

For C1: no separate hard delete. Removing a level, subject, block,
class level or portal link is a normal panel save, and the audit log
records the removed item's previous value, so a wrong deletion can be
recovered. Only add a permanent delete if the spec requires one.

For D1: add the reference breakpoints from research/design-tokens.md
(e.g. 640 px) to the layout checks, alongside 375, 768, 1024 and 1440.

Message 2 (verbatim):

Approve all the LOW items, with one change to U1: duplicate names
only warn for syllabus levels and subjects. For Class Levels,
duplicate names (case-insensitive, trimmed) block the save with a
clear message, because registration and the migration match classes
by name.

Apply these together with the C1, I1, I2 and D1 fixes.

## Response snapshot

Proposed the fixes first, then applied them. The durable record uses the recommended database collection. The user didn't pick between the collection and the log line, so this choice is stated in the reply.

- **C1**:
  - Spec: new FR-007 (removal is a normal save; a durable change record with each removed item's previous value), FR-012 (confirmation also for groups with content), a recovery edge case and a Key Entity.
  - research R3 rewritten: a `settingsChanges` collection written after a successful write, retried once, and a `settings_change_record_failed` log line on failure without failing the save; top-level `deletedAt` kept.
  - data-model gains the collection.
  - plan: Storage line, Constitution VI row and source tree updated.
  - panel-actions contract updated.
  - quickstart gains a recovery runbook.
  - ADR-0014 §4, its consequences and its alternatives updated.
- **I1**: FR-032 now states the name snapshot.
- **I2**: FR-050 says the text is verbatim and structural adaptations are reported.
- **D1**: 640 px (the reference theme's mobile-menu breakpoint) added to FR-006, SC-004, the plan, the public-sections width table and quickstart. A shared `e2e/helpers/layout.ts` provides the width list, the horizontal-scroll check and the overlap check.
- **LOW items**:
  - U1 as amended: syllabus level and subject duplicates warn only; Class Levels duplicates block the save with a message naming the row and the reason.
  - U2: whitespace-only cases added.
  - A1: FR-005 points to FR-045.
  - U3: all six old `/portal` slugs tested.
  - U4: `#site-footer` recorded in the contract.
  - U5: groups reorder too.
  - A2: the automated save check is under 2 s; the 1 s target is checked by hand on a production build.
  - A3: overlap defined in FR-006 and checked by the helper.
- **tasks.md**: 4 Foundation tasks added (removed-items test, settings-change model + `removedItems`, savePanel change record, layout helper). Story tasks edited, and IDs renumbered to T001–T115 with no gaps. Foundational count 17, total 115.

## Outcome

- ✅ Impact: All 12 findings addressed; the critical constitution issue (C1) is resolved by spec FR-007 and the change record.
- 🧪 Tests: none run (docs only)
- 📁 Files: spec, research, data-model, plan, 2 contracts, quickstart, tasks, ADR-0014
- 🔁 Next prompts: optionally re-run /sp.analyze; then /sp.implement after T001 (slice 1 committed)
- 🧠 Reflection: The console security log can't serve as an audit for recovery (no values, short retention), so the user's "audit log" direction needed a durable store. This was stated rather than assumed silently.

## Evaluation notes (flywheel)

- Failure modes observed: an inline bash heredoc with a Python triple-quoted string failed to parse; switched to a script file in the scratchpad. One tree-line match failed on spacing; fixed and re-run only the unapplied part.
- Graders run and results (PASS/FAIL): tasks format 115/115 sequential PASS; no temporary IDs left PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

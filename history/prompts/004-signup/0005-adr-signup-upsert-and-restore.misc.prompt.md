---
id: 0005
title: ADR signup upsert and restore
stage: misc
date: 2026-09-22
surface: agent
model: claude-opus-5
feature: 004-signup
branch: 004-signup
user: shezafatima
command: /sp.adr
labels: ["adr", "signup", "data-integrity", "upsert", "soft-delete"]
links:
  spec: specs/004-signup/spec.md
  ticket: null
  adr: history/adr/0001-signup-upsert-and-restore.md
  pr: null
files:
 - history/adr/0001-signup-upsert-and-restore.md
 - specs/004-signup/plan.md (ADR link added under Constitution Check)
tests:
 - none (documentation)
---

## Prompt

/sp.adr signup-upsert-and-restore
Scope: applies to records where one person should have exactly one
record (signups). It does NOT apply to contact messages: each
message is a separate record, even from the same email.

## Response snapshot

Loaded plan.md, research.md, data-model.md and contracts for
004-signup. `history/adr/` did not exist and no `create-adr` script is
present in `.specify/scripts/`, so ADR-0001 was written agent-natively
from `.specify/templates/adr-template.md`.

Decision clusters reviewed against the significance test:
- One-record-per-person upsert + restore + identical response +
  soft-delete interaction + concurrency retry → **ADR-0001** (passes
  all three: long-term data rule, six alternatives, cross-cutting to
  008 and future collections).
- Serial Playwright `forms` project, `AdminPagination` lift, CSV
  encoding → not ADR-worthy (test infra / single-file / format
  detail); remain in research.md.

ADR-0001 records: unique full email index (no partial filter), atomic
`findOneAndUpdate` with `$set` (incl. `deletedAt: null`), `$addToSet`
sources, `$setOnInsert` first date, `withDeleted: true` bypass, E11000
single retry, identical `200` response; and — per the user's scope
note — the explicit boundary that contact messages (008) are
append-only and must not reuse the upsert path. Alternatives A–F with
rejection reasons; positive/negative consequences including the
"cannot stay deleted" and "no value history" trade-offs. Plan.md now
links the ADR.

## Outcome

- ✅ Impact: First ADR in the repo; the one-per-person vs one-per-event boundary is now written down before 008 is planned.
- 🧪 Tests: none.
- 📁 Files: history/adr/0001-signup-upsert-and-restore.md, specs/004-signup/plan.md
- 🔁 Next prompts: `/sp.tasks`
- 🧠 Reflection: The user's scope note turned a feature-local decision into a reusable rule with an explicit negative case — worth prompting for on future ADRs.

## Evaluation notes (flywheel)

- Failure modes observed: no `create-adr.sh` script in this repo; fell back to template + manual ID allocation.
- Graders run and results (PASS/FAIL): ADR checklist PASS — clustered decision, ≥1 alternative with rationale (6), pros and cons for chosen and alternatives, concise.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): add a `create-adr.ps1` to `.specify/scripts/powershell/` so IDs are allocated by tooling.

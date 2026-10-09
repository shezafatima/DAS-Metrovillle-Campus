---
id: 0005
title: ADR career application one per person
stage: general
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: none
branch: 009-admin-notifications
user: s2636309@gmail.com
command: /sp.adr
labels: ["adr", "career-applications", "data-integrity"]
links:
  spec: null
  ticket: null
  adr: history/adr/0003-career-application-one-per-person.md
  pr: null
files:
 - history/adr/0003-career-application-one-per-person.md
 - history/adr/0001-signup-upsert-and-restore.md
tests:
 - none
---

## Prompt

/sp.adr career-application-one-per-person
Supersedes signup-upsert-and-restore. Career applications are
matched on both email and phone and a repeat attempt is refused,
not merged. Cover why the upsert-and-restore rule was dropped when
signups became applications, and why contact messages remain one
record per submission.

## Response snapshot

Created ADR-0003 (`history/adr/0003-career-application-one-per-person.md`) directly from the user's explicit instruction and PRD v0.3 §5.9/§6.7 (no plan.md exists yet for 012-careers — that spec/feature hasn't been created, so this ADR precedes it rather than being extracted from it).

Decision: `careerApplications` uses a partial unique index on `{ email, phone }` filtered to `deletedAt: null` (compound identity, not email alone), with a plain insert on the write path — no upsert. A collision returns a visible rejection to the submitter (never a silent merge or update). Because the index is partial, only an admin soft-delete frees the key, making admin delete the sole path to reapplication, matching PRD §6.7 exactly.

Marked the ADR as explicitly superseding ADR-0001's "reusable verbatim for any future one-per-person collection" claim, since career applications need the opposite of every one of ADR-0001's defining choices: refuse instead of upsert, visible rejection instead of an identical response, admin-gated reapplication instead of automatic restore-on-resubmit. Updated ADR-0001's Status line to "Superseded — see ADR-0003" with a one-line pointer, without rewriting any of its original Decision/Consequences/Alternatives content (historical record preserved).

Added an explicit "Why contact messages are unaffected" appendix to ADR-0003, cross-referencing ADR-0001's existing boundary rule (messages are append-only, identity is not the question) rather than re-deriving it, since that reasoning was already settled and unaffected by this change.

Five alternatives considered and rejected: (A) reuse ADR-0001's upsert-and-restore as-is, (B) merge/update-in-place, (C) application-level check-then-insert, (D) full (non-partial) unique index, (E) single-field unique key.

## Outcome

- ✅ Impact: Establishes the data-integrity model for career applications ahead of the 012-careers spec/plan, satisfying Constitution VI's requirement that one-per-person rules be database-enforced.
- 🧪 Tests: none (architecture documentation only; the partial-unique-index behavior will need a concurrency test when 012-careers is planned/implemented, per ADR-0001's own precedent of a 10-way `Promise.all` DB test)
- 📁 Files: `history/adr/0003-career-application-one-per-person.md` (new), `history/adr/0001-signup-upsert-and-restore.md` (Status line updated)
- 🔁 Next prompts: When 012-careers is specified/planned, its plan.md should reference ADR-0003 directly and resolve the CV-file-lifecycle-on-delete question flagged in ADR-0003's Negative consequences (whether the old CV is deleted, retained, or orphaned when an admin deletes an application to allow reapplication).
- 🧠 Reflection: This ADR was created ahead of its feature's spec/plan (no 012-careers directory exists yet), directly from the PRD and the user's explicit content — the standard /sp.adr flow assumes an existing plan.md to extract decisions from, but the user supplied the decision directly, so the workflow was adapted rather than blocked on a missing prerequisite.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): Decision clustered (one integrated identity/write-path decision, not atomic choices) — PASS; explicit alternatives with rationale — PASS (5 alternatives); pros/cons for chosen approach and alternatives — PASS; concise but sufficiently detailed — PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

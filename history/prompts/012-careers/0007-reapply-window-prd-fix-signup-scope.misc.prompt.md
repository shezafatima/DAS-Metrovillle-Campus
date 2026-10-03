---
id: 0007
title: Reapply window, PRD fix, signup scope
stage: misc
date: 2026-10-02
surface: agent
model: claude-opus-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: none (direct request)
labels: ["careers","adr","prd","reapply-window","concurrency","signup-retirement"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0008-career-application-30-day-reapply-window.md
  pr: null
files:
 - docs/prd.md
 - history/adr/0008-career-application-30-day-reapply-window.md
 - history/adr/0003-career-application-one-per-person.md
 - history/adr/0006-career-application-match-either-field.md
 - history/adr/0007-private-document-store-vercel-blob.md
 - specs/012-careers/spec.md
 - specs/012-careers/plan.md
 - specs/012-careers/research.md
 - specs/012-careers/data-model.md
 - specs/012-careers/quickstart.md
 - specs/012-careers/contracts/public-careers-api.md
 - specs/012-careers/contracts/document-store.md
 - specs/012-careers/checklists/requirements.md
tests:
 - none
---

## Prompt

Three corrections to feature 012-careers before /sp.tasks. Do not write code yet.

1. FIX PRD §5.9 — wrong matching rule
docs/prd.md §5.9 says a repeat applicant is matched on "both email and
phone". This contradicts ADR-0006 and the data model, which both use
EITHER. Correct §5.9 to: matched on email OR phone — either one matching
counts as the same person.

2. NEW RULE — 30-day reapply window (supersedes "one per person forever")
A person may not apply again within 30 days of their last application,
matched on email OR phone. After 30 days they may apply again without an
admin deleting anything.

Consequences to work through and record:
- The unique partial indexes on email and phone in data-model.md cannot
  express a time window. Replace them with a non-unique lookup index plus
  an application-level check: on submit, look for a non-deleted
  application with the same email or phone whose createdAt is within the
  last 30 days. Explain how you prevent two simultaneous submissions from
  both passing this check.
- Decide and state what happens to the earlier application when someone
  reapplies after 30 days. Default: keep both as separate records, admin
  list shows newest first. Flag this for client confirmation.
- The refusal message must tell the applicant when they may reapply.
- Make 30 days a named constant, not a scattered literal.
- Soft-deleted applications must not block a reapply.
- Supersede ADR-0003 and ADR-0006. Mark them superseded with a pointer to
  the new ADR; do not delete them. Write the new ADR covering the 30-day
  window and the index change.
- PRD §5.9 and Open Question 5 (reapply policy) are both answered by this
  rule — update §5.9, resolve Q5, add a v0.4 change-log row.

3. VERIFY — signup removal scope
plan.md lists ~40 files to delete for signup removal. List them for me
before deleting. The decision on record was to retire the PUBLIC signup
page and its E2E specs only, keeping the admin signup list, its API tests
and CSV export, because the client still has those lead records. Confirm
the list matches that, and flag anything that would delete admin-side
signup functionality or drop the signups collection.

Note: the "pending abandoned (≤1 h)" cleanup in data-model.md is correct.
Leave it as is.

Update docs/prd.md, specs/012-careers/data-model.md, plan.md and the
affected ADRs. Report what changed before I run /sp.tasks.

## Response snapshot

(1) PRD v0.4: §5.9 = email OR phone, 30-day window, refusal gives the reapply date, earlier record kept (TBD client), main-admin delete allows sooner; §7 data line updated; Q5 resolved; change-log row added. (2) ADR-0008 created: `CAREERS_REAPPLY_WINDOW_DAYS = 30` in rules.ts, PKT calendar days (D blocks through D+29), non-unique {email,createdAt}/{phone,createdAt} indexes, race prevention via per-identity locks (`careerApplicationLocks`, hashed `_id`, owner, 30 s lease, conditional upsert whose E11000 = held, sorted acquisition, 2 s retry → 503, release by owner in finally); 409 carries reapplyFrom; soft-deleted never block; earlier application kept (client confirmation pending). Alternatives: aging partial index, claim docs, transactions, bare check, merge or auto-delete. ADR-0003/0006 marked superseded; ADR-0007 references updated. Spec, research, data-model, contracts, quickstart and checklist aligned; Constitution VI wording note (recommend /sp.constitution). (3) Signup scope does NOT match the claimed decision: the 012 brief/spec FR-033 say remove the collection, admin screen and public form; the only "keep admin signup tests" record is the 006 PHR, which parked the public specs until 012. Listed all 38 files by side; the removal inventory is marked ON HOLD in plan.md; nothing deleted.

## Outcome

- ✅ Impact: Window rule designed and recorded; PRD consistent; signup scope conflict surfaced, not resolved.
- 🧪 Tests: none (docs only)
- 📁 Files: see list above
- 🔁 Next prompts: owner decides signup scope; then /sp.tasks; optionally /sp.constitution for VI wording
- 🧠 Reflection: the user's recollection conflicted with their own 012 brief; flagged with evidence instead of following either silently.

## Evaluation notes (flywheel)

- Failure modes observed: bash heredoc quoting failed again; switched to a script file in the scratchpad
- Graders run and results (PASS/FAIL): ADR clustered + alternatives + pros/cons PASS; grep confirms no stale ADR-0006 unique-index references in 012 docs
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

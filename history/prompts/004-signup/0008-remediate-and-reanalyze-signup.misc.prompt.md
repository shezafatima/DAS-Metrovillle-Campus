---
id: 0008
title: Remediate and reanalyze signup
stage: misc
date: 2026-09-22
surface: agent
model: claude-opus-5
feature: 004-signup
branch: 004-signup
user: shezafatima
command: none (approval of /sp.analyze remediation, then re-run)
labels: ["signup", "analyze", "remediation", "tokens", "tasks"]
links:
  spec: specs/004-signup/spec.md
  ticket: null
  adr: history/adr/0001-signup-upsert-and-restore.md
  pr: null
files:
 - specs/004-signup/spec.md
 - specs/004-signup/tasks.md
 - specs/004-signup/plan.md
 - specs/004-signup/research.md
 - specs/004-signup/data-model.md
 - specs/004-signup/contracts/public-signup-api.md
 - specs/004-signup/contracts/signup-section.md
tests:
 - none (planning artifacts)
---

## Prompt

Yes. Apply the fixes for all MEDIUM items (I1, A3, U1, C1, A1, C2,
A2, I2) and include the optional D1 task. Two adjustments:

- U1: add the colours as general tokens (--color-error,
  --color-success) in the design system, not signup-specific ones,
  so the contact form and admin can reuse them. Take the values from
  research/design-tokens.md if the reference has them; if not,
  document them as a deviation.
- D1: if news already has its own Paged type or escapeReg helper,
  move that one into the shared location and use it in both
  features, rather than creating a second copy.

Then re-run /sp.analyze and show me the result before implementing.

## Response snapshot

Applied all requested fixes:
- I1/A3: spec US1 scenario 8 and US2 scenario 4 reworded.
- U1: general `--color-error` (#F44336 = reference CTA red, already
  the admin destructive slot) and `--color-success` (#00BCD4 =
  reference accent); reference has no error/success state so recorded
  as a deviation in spec, research §11, contract, and T019.
- C1/A1: T021 clears a field's error on edit; labels sr-only at all
  widths; T024 tests both.
- C2: T032 seeds 120 rows and asserts three searches < 1 s.
- A2: T048 uses an input locator instead of getByLabel on the
  aria-hidden honeypot.
- I2: public contract now says honeypot returns before the limiter.
- D1: news already had `Paged<T>` and `escapeRegExp` → new T014
  moves them (plus ADMIN_PAGE_SIZE) into `src/lib/admin-list.ts`,
  updates both news query files, adds a test; T031 imports from the
  shared module. Inserted as T014 and renumbered T014–T058 → T015–T059
  with a perl pass; verified no gaps/dangling references.

Re-ran the analysis: all 10 remediated findings resolved, 0 CRITICAL,
coverage 39/39, 59 tasks. Two LOW items remain open (U2 JSON key
shape; new N1 note that #F44336 on white is ≈3.9:1 contrast —
mitigated by bold + white chip, flagged as follow-up, not blocking).

## Outcome

- ✅ Impact: Artifacts consistent and fully covered; ready for `/sp.implement`.
- 🧪 Tests: none.
- 📁 Files: spec.md, tasks.md, plan.md, research.md, data-model.md, contracts/public-signup-api.md, contracts/signup-section.md
- 🔁 Next prompts: commit/stash 003 work, then `/sp.implement`.
- 🧠 Reflection: Renumbering via a single regex pass with a post-check for gaps and dangling IDs was safer than inserting an out-of-order task.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): task format 59/59 PASS; ID sequence PASS; stale-string grep PASS; coverage 100% PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

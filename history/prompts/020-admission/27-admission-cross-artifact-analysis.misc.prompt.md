---
id: 27
title: Admission cross-artifact analysis
stage: misc
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 020-admission
branch: 020-admission
user: shezafatima
command: /sp.analyze
labels: ["admission", "analysis", "constitution", "fidelity"]
links:
  spec: specs/020-admission/spec.md
  ticket: null
  adr: history/adr/0011-admission-window-evaluation.md
  pr: null
files:
 - none (read-only analysis)
tests:
 - none
---

## Prompt

/sp.analyze (no arguments)

## Response snapshot

Read-only analysis of spec.md, plan.md and tasks.md against constitution v3.0.0 and the reference screenshots. Findings: 10.
- 2 CRITICAL:
  - Reference screenshots (`screenshots/das.edu.pk_admission_*.png`, `das.edu.pk_admission_uniform_*.png`) are never cited, and the layout deviations are not documented. The uniform flip cards replace the reference's category headings with cyan Boys and pink Girls list cards beside the photos; the procedure step bands, icons and next-step buttons are not reproduced; the window banner is new (Constitution I, XI).
  - The reference site's own breakpoints are not in the definition-of-done checks (Constitution XI).
- 1 HIGH: the verbatim category and gender headings are not displayed anywhere (FR-021).
- 2 MEDIUM:
  - The spec calls "Registration", "Admission Test", "Admission Formalities" and "Success" background labels; they are red next-step buttons.
  - US6's visible state has no E2E test.
- 5 LOW: a dangling Eligibility sentence, the TZ test mechanism, T053 mostly a no-op, UniformCards/UniformSection naming drift, ADR-0011 still Proposed.
Coverage: 34/34 FRs mapped to tasks (FR-021 partially).

## Outcome

- ✅ Impact: 2 CRITICAL issues must be resolved before /sp.implement
- 🧪 Tests: none
- 📁 Files: none modified
- 🔁 Next prompts: approve remediation edits to the spec (Deviations section), plan and tasks
- 🧠 Reflection: the reference screenshots should have been checked during /sp.specify; doing so would have caught the layout deviation and the mislabelled buttons

## Evaluation notes (flywheel)

- Failure modes observed: spec described the reference structure from scraped HTML only, not from screenshots
- Graders run and results (PASS/FAIL): coverage 100% (1 partial); constitution check FAIL (2)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): check screenshots/ for every reference page during /sp.specify

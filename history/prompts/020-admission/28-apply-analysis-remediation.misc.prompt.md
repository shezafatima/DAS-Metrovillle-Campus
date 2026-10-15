---
id: 28
title: Apply analysis remediation
stage: misc
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 020-admission
branch: 020-admission
user: shezafatima
command: remediation of /sp.analyze findings
labels: ["admission", "analysis", "remediation", "fidelity", "accessibility"]
links:
  spec: specs/020-admission/spec.md
  ticket: null
  adr: history/adr/0011-admission-window-evaluation.md
  pr: null
files:
 - specs/020-admission/spec.md
 - specs/020-admission/plan.md
 - specs/020-admission/tasks.md
 - specs/020-admission/research.md
 - specs/020-admission/data-model.md
 - specs/020-admission/contracts/flip-coverflow.md
 - history/adr/0011-admission-window-evaluation.md
tests:
 - none (planning artifacts only)
---

## Prompt

H1: (a). Each card front shows the category as a small label
("Kids Uniform") above Boys/Girls as the main text. The card's h3
reads in full, e.g. "Kids Uniform – Boys", so it makes sense on its
own to screen readers. Same on the back.

Yes, suggest concrete fixes for D1, D2, H1, M1, M2 and the low items.
Show them before applying.

---

Yes, apply all of them.

Card backs: navy, the existing theme token, consistent with the home
coverflow. Not the reference's #ddffff / #ffeeee: they aren't theme
colours, and colour-coding boys/girls isn't wanted. The Boys/Girls
text identifies each card.

ADR-0011: approved, mark it Accepted.

## Response snapshot

Proposed fixes and, once approved, applied them:
- D1: added a "Deviations from the reference" section V1–V7 to the spec, citing the screenshots; noted it in plan row I; added T071 (screenshot comparison).
- D2: reference breakpoints 480/640/782/1280 and 1023/1025 added to FR-033, the plan's target platform, T044 and T069 (following 006/007/008).
- H1: each card heading is "{category} – {gender}", with the category as a small label and a screen-reader-only dash. The back shows the same text, aria-hidden, and its list is labelled by the front heading. The cardTitle map was removed; T043/T044 assert the exact headings.
- Card backs stay theme navy; the reference's cyan/pink was rejected and recorded in V7 and R8.
- M1: the next-step buttons are now described correctly.
- M2: the US6 shown-state test approach is documented.
- Low items: T007 TZ mechanism, T053 scope, UniformSection naming, plan e2e file list.
- ADR-0011 marked Accepted. Procedure step headings and intro lines are centred as on the reference (R12, T028).
tasks.md: 71 tasks, format valid.

## Outcome

- ✅ Impact: All analysis findings resolved; ready for /sp.implement
- 🧪 Tests: none
- 📁 Files: see list
- 🔁 Next prompts: /sp.implement (T001 needs the 020-news-category-label edits committed or stashed first)
- 🧠 Reflection: showing the reference's colours as an option let the requester make an explicit, recorded decision against them

## Evaluation notes (flywheel)

- Failure modes observed: the analysis report misstated an "800 px" breakpoint; corrected before the proposals
- Graders run and results (PASS/FAIL): task format PASS (71/71, sequential)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

---
id: 0005
title: Apply analysis remediation
stage: misc
date: 2026-10-10
surface: agent
model: claude-opus-5-5
feature: 017-about
branch: 017-about
user: shezafatima
command: /sp.analyze follow-up (apply remediation)
labels: ["about", "remediation", "constitution", "axe", "tasks"]
links:
  spec: specs/017-about/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/017-about/spec.md
 - specs/017-about/plan.md
 - specs/017-about/research.md
 - specs/017-about/data-model.md
 - specs/017-about/contracts/about-content.md
 - specs/017-about/contracts/page-structure.md
 - specs/017-about/tasks.md
 - history/prompts/017-about/0005-apply-analysis-remediation.misc.prompt.md
tests:
 - none (planning documents only)
---

## Prompt

(1) Yes, suggest concrete edits for C1, C2, G1, G3, I1–I4 and the medium
and low items. Show them before applying.

For C1: add the deviation note to spec.md for now. Also tell me
exactly how Principle I is worded. I'll amend it separately through
/sp.constitution so das.edu.pk is a loose reference, not a layout to
match, because every redesigned feature now deviates from it.

(2) Apply all of it, with one change to U2: an empty Messages section is
hidden and removed from the About dropdown, the same rule as the
management team. Do not require at least one message.

For I1: approve axe (@axe-core/playwright as a dev dependency), with
an automated accessibility check on /about in the E2E specs, rather
than rewording SC-008.

Then I'll run /sp.implement.

## Response snapshot

Quoted Principle I verbatim and named the other reference-tied clauses for the owner's /sp.constitution amendment: the VII rationale, and XI bullets 1–2 (a MAJOR bump). Proposed the edits, then applied them with the owner's two changes.

- **Spec**: Deviation from the Reference Site section (C1). Session 2026-10-10 clarifications (empty Messages hidden; axe approved). New FR-016a (Messages visibility). FR-008 (language only; direction derived), FR-012 (side by side from 768 px), FR-013 (divides by 3 → 3 columns) and FR-016/FR-019 (de-duplicated). Key Entities corrected. SC-002 generalised. SC-008 changed to an axe scan in both team modes.
- **Plan**: rows I, II (lucide via shadcn/ui; axe owner-approved), VII (three About tokens) and XI (reference breakpoints not applicable) updated. Complexity Tracking records axe. File list adds package.json, docs/architecture.md, design-tokens.md and globals.css.
- **Research**: R4 aboutView takes messageCount, R6 bg-about-panel, R7 token ratios, R10 axe decision, R11.
- **Data model and contracts**: messages visibility rule; Urdu-name lang/dir; axe scan section; invariant 4.
- **Tasks**: rewritten and renumbered to 56.
  - New T004 installs axe at an exact version compatible with Playwright 1.63, recorded in docs/architecture.md.
  - New T005 adds the --aspect-about-person, --aspect-about-story and --color-about-panel tokens plus the design-tokens.md About section.
  - Messages starts as an empty stub in T010, so its menu entry is hidden until US4 fills it. US1 plus US2 is therefore deployable.
  - The US2 E2E covers only the built sections, with Messages and Team clicks added in T041 and T046.
  - The Ijaz Afzal line-break wording is fixed (I3), Urdu names get lang/dir (U1), server-only is made definite (A1), the page is checked for tagline absence (G2), the team grid uses md (I7), and the renames are committed with Phase 1 (I8).
  - T049 adds the axe scan in both modes.

## Outcome

- ✅ Impact: Both CRITICAL findings resolved in the planning artifacts. Owner decisions recorded. Tasks ready for /sp.implement.
- 🧪 Tests: none run
- 📁 Files: 7 planning documents + this PHR
- 🔁 Next prompts: /sp.constitution (loosen Principle I, VII rationale, XI bullets 1–2); /sp.implement
- 🧠 Reflection: Making Messages hide when empty also fixed the MVP deploy hazard, since the menu can no longer point at an unbuilt Messages section.

## Evaluation notes (flywheel)

- Failure modes observed: the C2 analysis over-counted Tailwind theme values (lg:w-1/4, max-w-xs) as raw values; corrected before applying.
- Graders run and results (PASS/FAIL): tasks format check PASS (56/56, no ID gaps)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

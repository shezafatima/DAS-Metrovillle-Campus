---
id: 0006
title: Apply analysis remediation edits
stage: misc
date: 2026-10-13
surface: agent
model: claude-opus-5-5
feature: 019-resources
branch: 019-resources
user: shezafatima
command: none
labels: ["resources", "analyze", "remediation", "constitution-deviation"]
links:
  spec: specs/019-resources/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/019-resources/spec.md
 - specs/019-resources/tasks.md
tests:
 - none run
---

## Prompt

Yes, suggest concrete edits for D1, I2, U1, D2 and F1. Show them
before applying. Leave G1–G4 to handle during implementation.

(follow-up) Apply all of them, and I approve both deviations

## Response snapshot

Showed the proposed edits, then applied them after the owner approved:
- D1 + I2 (tasks.md ground rules, T011, T017): transitions are `motion-safe:transition-transform` / `motion-safe:transition-colors` with `duration-(--motion-fast)`, with no bracket values; T011 asserts it.
- U1 (T012, T013, T018): the flyer `figure` is sized from the image's own ratio (`aspectRatio`, `maxWidth = calc(var(--size-resources-flyer-max-h) * w / h)`), with a `bg-surface` frame and an `object-contain` image; the tests check the frame keeps its box when the image request is aborted.
- D2 (spec.md "Deviation from the Reference Site"): composed tokens (Constitution I/VII) and US4's document-only verification (Constitution XI) are recorded, "Approved by the owner on 2026-10-13".
- F1 (T020): `anchored-sections.tsx` stays because /admission uses `AnchoredPage`.
G1–G4 were deferred to implementation, as asked.

## Outcome

- ✅ Impact: The medium-severity analysis findings are resolved except I1 and C1, which this prompt didn't cover; the constitution deviations are approved.
- 🧪 Tests: None run.
- 📁 Files: spec.md, tasks.md
- 🔁 Next prompts: /sp.implement (I1 and C1 still open)
- 🧠 Reflection: Sizing the frame from the content's own width and height avoids a new token tied to one image.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

---
id: 0002
title: Clarify academics title layout heading
stage: spec
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 018-academics
branch: 018-academics
user: shezafatima
command: /sp.clarify
labels: ["clarify", "academics", "spec"]
links:
  spec: specs/018-academics/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/018-academics/spec.md
tests:
 - none
---

## Prompt

/sp.clarify (no arguments)

Answers in the session: "yes" (Q1), "yes" (Q2), "yes" (Q3).

## Response snapshot

Asked 3 questions; the recommended option was accepted each time:
1. The page H1 is "Academics", marked pending client approval (FR-001, Open Questions #5).
2. Teachers' Training layout: from tablet width up, the text and list are in one column with the collage beside them, and the video runs full width below. Phones: text → photos → video. With no photos, the text spans the full width (US5, FR-013).
3. Default for the Hifz heading: stored and displayed exactly as "HIFZ-UL-QURAN PROGRAM", with no case change in content or CSS (T4).
Every answer was recorded under Clarifications › Session 2026-10-12.

## Outcome

- ✅ Impact: Resolved the missing H1 text, the ambiguous Teachers' Training layout and the undecided default case for the Hifz heading.
- 🧪 Tests: none (spec only)
- 📁 Files: specs/018-academics/spec.md
- 🔁 Next prompts: /sp.plan
- 🧠 Reflection: The spec was already thorough, so only 3 high-impact gaps were worth asking about.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

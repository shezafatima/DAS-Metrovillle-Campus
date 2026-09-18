---
id: 0005
title: Use real logo asset in plan
stage: plan
date: 2026-09-16
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: /sp.phr
labels: [plan, site-shell, logo, assets]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-site-shell/plan.md
tests:
 - none (documentation-only change)
---

## Prompt

The logo files are now in public/images/ (logo.svg). Update
specs/001-site-shell/plan.md to use these files instead of any
placeholder. Logo size must match the reference screenshots and
research/design-tokens.md at each viewport. Alt text:
"Dar-e-Arqam School Metroville Campus". Change nothing else.

## Response snapshot

Confirmed `public/images/logo.svg` exists (1974×797 intrinsic SVG,
generated via VTracer) and checked `research/design-tokens.md` plus every
`research/tokens/*.json` capture for an extracted logo pixel size — none
exists (the only "logo" hits in the raw JSON were class-name substrings
like `mobile-logo-pos-left`, not measured dimensions), so the plan directs
implementation to size the logo against the reference screenshots/tokens
per viewport rather than inventing a number not backed by research. Edited
the single `logo.tsx` line in plan.md's Project Structure source tree
(previously "server — links to `/`" with no asset) to specify: renders
`public/images/logo.svg`, alt text exactly `"Dar-e-Arqam School Metroville
Campus"`, links to `/`, and is sized to match
`screenshots/`/`research/design-tokens.md` at each viewport, explicitly
noting "no placeholder". No other section of plan.md was touched, per the
instruction to change nothing else.

## Outcome

- ✅ Impact: `specs/001-site-shell/plan.md`'s Logo component spec now points at the real asset with required alt text and viewport-matched sizing instead of a placeholder-implying description.
- 🧪 Tests: None — documentation-only change; no code exists yet for `logo.tsx`.
- 📁 Files: specs/001-site-shell/plan.md (edited, lines 93–96).
- 🔁 Next prompts: When `/sp.implement` reaches Foundational task T006 (Logo component), use this updated plan line as the spec for `next/image`'s `src`/`alt`/`sizes`.
- 🧠 Reflection: research/design-tokens.md has no extracted logo pixel size (a known gap, not silently invented) — plan correctly defers exact sizing to screenshot/token comparison at implementation time rather than fabricating a number.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): not applicable — no automated grader configured for this stage.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

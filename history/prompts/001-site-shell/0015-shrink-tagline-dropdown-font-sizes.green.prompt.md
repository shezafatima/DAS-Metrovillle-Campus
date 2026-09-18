---
id: 0015
title: Shrink tagline and dropdown font sizes
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: [fidelity, typography]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/app/globals.css
tests:
 - npm test (Vitest) — 9 files, 41 tests, all passing
 - npm run test:e2e (Playwright, chromium) — 51/52 passing, 1 intentionally skipped
 - npx tsc --noEmit — clean
---

## Prompt

"still the inner text font is too big but the navbar subheading is too
big decrease the font size"

## Response snapshot

Reduced two tokens in `globals.css`: `--text-nav-sub` (dropdown/sub-menu
item text — the "inner text") from 14px to 12px, and `--text-nav-tagline`
(the small caption under each top-level label, e.g. "Front Page" under
Home) from 11px to 10px, with proportionally smaller line-heights. Both
were already documented as a research gap (not captured in
research/design-tokens.md's extraction), so this is a direct response to
user feedback rather than overriding a sourced value. Verified with a
screenshot (dropdown open, showing both the smaller tagline and smaller
dropdown item text together) and the full test suite.

## Outcome

- ✅ Impact: both the nav taglines and the dropdown/sub-menu text now
  render smaller, per direct feedback.
- 🧪 Tests: Vitest 41/41; Playwright 51/52 (1 skip by design); tsc clean.
- 📁 Files: src/app/globals.css only.
- 🔁 Next prompts: none required.
- 🧠 Reflection: n/a — small, direct token tweak.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): Vitest PASS, Playwright PASS, tsc
  PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

---
id: 0008
title: Fix top bar color fidelity
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: [fidelity, top-bar, color-tokens, design-tokens]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/app/globals.css
 - src/components/site-shell/top-bar.tsx
 - research/design-tokens.md
tests:
 - npm test (Vitest) — 6 files, 24 tests, all passing
 - npm run test:e2e (Playwright, chromium) — 42/42 non-skipped passing, 5 intentionally skipped (unchanged from prior run)
 - npx tsc --noEmit — clean
---

## Prompt

they are in the same project screenshots with this name

(Ambiguous follow-up; clarified via AskUserQuestion into: "Use screenshots/ for
visual fidelity comparison" against the implemented site shell, then, after
finding a discrepancy, the user picked "Switch TopBar to yellow" to resolve
it.)

## Response snapshot

Used `sharp` (already in `node_modules`) to crop the header region out of
`screenshots/das.edu.pk_.png`, `das.edu.pk_(iPad Pro).png`, and
`das.edu.pk_(Moto G Power).png`, then viewed the crops. Found that the
reference's top bar is a solid yellow banner on every viewport, but
`research/design-tokens.md`'s own JSON capture had recorded that exact
element's background as gray `#D7D6D6` (what our `TopBar` was using) and
its cross-check section concluded yellow "doesn't appear at scale." Sampled
raw pixels from the cropped images directly (not eyeballed) at all three
viewports — all three read exactly `rgb(255, 255, 0)` / `#FFFF00`, a value
the doc already had in its color-occurrence table but mischaracterized as
"minor, small elements only" (84 occurrences undercounted the full-width
top bar because the extraction sweep evidently sampled a transparent inner
element while an ancestor paints the visible yellow). Asked the user how to
resolve the conflict between the doc and the screenshots; they chose to fix
it toward the photographic evidence. Added `--color-topbar: #ffff00` to
`globals.css` (documented why, not a raw value), updated `TopBar.tsx` to
`bg-topbar` with navy (`text-primary`) text/icons and white rounded-square
social-icon chips (also visible in the reference), and corrected
`research/design-tokens.md`'s cross-check note, color-palette table role,
and suggested-token summary to reflect the real role of `#FFFF00`. Verified
with a fresh Playwright screenshot (matches reference structure/contrast)
and reran the full Vitest + Playwright + tsc suites — one Playwright test
flaked on first run (`header-scroll.spec.ts` mobile-not-sticky check, timing
issue on a first-compile page load) and passed cleanly in isolation,
unrelated to this change.

## Outcome

- ✅ Impact: `TopBar` now visually matches the reference's yellow banner;
  `research/design-tokens.md` corrected so future work doesn't re-inherit
  the same undercounted-role mistake.
- 🧪 Tests: Vitest 24/24; Playwright 42/42 non-skipped (5 unchanged skips);
  tsc clean. No test assertions needed updating — none had hardcoded the
  old gray value.
- 📁 Files: src/app/globals.css, src/components/site-shell/top-bar.tsx,
  research/design-tokens.md (all edited, no new files).
- 🔁 Next prompts: none required for this fix; `/sp.analyze` still stands
  as the suggested next step for the whole feature.
- 🧠 Reflection: A research/extraction document's *narrative conclusion*
  (role assessment) can be wrong even when the *raw measured value* it
  reports is correct — worth treating occurrence-count-based role
  classifications as a hypothesis to check against the actual screenshots
  when they're available, not as ground truth on their own.

## Evaluation notes (flywheel)

- Failure modes observed: none in the fix itself; one pre-existing flaky
  e2e test (timing-sensitive, unrelated to this change) reproduced once
  and passed on retry.
- Graders run and results (PASS/FAIL): Vitest PASS, Playwright PASS
  (after isolated retry of the one flake), tsc PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): if `header-scroll.spec.ts`'s
  mobile test flakes again under full-suite load, consider adding a short
  explicit wait for the page's `load` state before the first
  `getBoundingClientRect()` read rather than relying on `goto`'s default.

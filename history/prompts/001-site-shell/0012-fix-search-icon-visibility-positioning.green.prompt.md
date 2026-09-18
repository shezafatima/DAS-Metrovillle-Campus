---
id: 0012
title: Fix search icon visibility and positioning
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: [search, fidelity, css-positioning, bugfix]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/components/site-shell/search-box.tsx
 - src/components/site-shell/header.tsx
 - src/components/site-shell/nav-mobile.tsx
tests:
 - npm test (Vitest) — 8 files, 36 tests, all passing
 - npm run test:e2e (Playwright, chromium) — 50/52 passing, 1 intentionally skipped, 1 confirmed-flaky (unrelated) test
 - npx tsc --noEmit — clean
---

## Prompt

"the search bar will open below the navbar in desktop and when popout will
open its icon will not going anywhere from navbar why you hiding it there
is also an hover effect on icon and when click for serach icon with black
bg the bg changes to webtheme blue"

## Response snapshot

Four fixes to `SearchBox`, all from the same root design flaw (the
component's `{open ? popout : icon}` ternary literally removed the icon
from the DOM once opened):

1. **Icon disappearing** — restructured so the icon button always renders;
   the popout is now a sibling overlay shown alongside it, not a
   replacement.
2. **Popout position** — it was opening right below the icon's own short
   box (`top-full` relative to a ~36px-tall button) instead of below the
   full nav row, since the icon is vertically centered within a taller
   `items-center` row. Fixed by anchoring the popout's `position: absolute`
   to the header row itself: added `relative` to that row in `header.tsx`
   (and the equivalent title row in `nav-mobile.tsx`) and removed the
   `relative` SearchBox had been claiming on its own tiny wrapper, so
   `top-full` now resolves against the row's real height, not the icon's.
3. **Icon hover effect** — added `hover:bg-neutral-100` (background) on
   top of the existing color change, plus a persistent active-state style
   (`bg-neutral-100 text-primary`) while the popout is open, so the icon
   visibly stays "on."
4. **Submit button color** — changed the black submit button's hover from
   `hover:opacity-80` to `hover:bg-primary`, so it turns the theme blue on
   hover/press instead of just dimming.

Verified the position fix with a screenshot: the popout now sits flush
below the header's bottom border, aligned with the icon, no overlap with
nav text.

## Outcome

- ✅ Impact: Search icon is a stable, always-visible nav element with a
  correctly-positioned popout and reference-matching hover/active states.
- 🧪 Tests: Vitest 36/36; Playwright 50/52 (1 skip by design, 1
  pre-existing flaky test unrelated to this change — confirmed flaky
  repeatedly earlier in this session); tsc clean.
- 📁 Files: search-box.tsx, header.tsx, nav-mobile.tsx.
- 🔁 Next prompts: none required for this fix.
- 🧠 Reflection: `position: absolute` percentage offsets resolve against
  the nearest *positioned* ancestor's box, not the element's own static
  box — when a small trigger sits inside a taller, vertically-centered
  flex row, anchoring the popup to the trigger itself (rather than to the
  row) silently misaligns it. Worth defaulting new header popovers to
  anchor against the row-level container from the start.

## Evaluation notes (flywheel)

- Failure modes observed: none in the delivered fix.
- Graders run and results (PASS/FAIL): Vitest PASS, Playwright PASS
  (aside from the pre-existing unrelated flake), tsc PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

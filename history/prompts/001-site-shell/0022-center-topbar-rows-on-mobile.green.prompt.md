---
id: 0022
title: Center top bar rows on mobile
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: ["css", "tailwind", "responsive", "top-bar"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - src/components/site-shell/top-bar.tsx
tests:
 - vitest run src/components/site-shell/top-bar.test.tsx (4 passed)
---

## Prompt

top bar social links mustbe allign in center in mobile view

(follow-up) topbar links will also must be align on center prpoperly on responsiveness

## Response snapshot

`TopBar`'s outer row is `flex flex-wrap justify-between`: portal quick-links on one side, social icons on the other. Below the width where both fit on one line (~768px, i.e. below `md`), each wraps onto its own line — but `justify-between` degenerates to flex-start for a lone wrapped item, so both rows sat flush left instead of centered.

Fixed both rows the same way: gave each `<ul>` `max-md:w-full` so it claims the full line width once wrapped, plus `justify-center` (unconditional on the portal-links `<ul>` — harmless at `md+` since the list's own width already matches its content there, so centering has nothing to redistribute; scoped to `max-md:justify-center` on the `SocialLinks` `<ul>` via its existing `className` prop). Verified with Playwright screenshots at 375/500/640/768px: both rows center correctly below 768px, and the normal desktop layout (portal links left, social icons right, single row) is unchanged at 768px and above.

## Outcome

- ✅ Impact: Top bar's portal-links row and social-icons row both center horizontally on mobile/narrow viewports instead of sitting flush left; desktop layout unaffected.
- 🧪 Tests: top-bar vitest suite passes (4 tests) — layout-only change, no test updates needed.
- 📁 Files: src/components/site-shell/top-bar.tsx.
- 🔁 Next prompts: none pending.
- 🧠 Reflection: `flex-wrap` + `justify-between` silently collapses to flex-start once a line has only one item — worth remembering as a recurring pattern anywhere a two-item `justify-between` row can wrap on narrow viewports.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): vitest top-bar — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): none.

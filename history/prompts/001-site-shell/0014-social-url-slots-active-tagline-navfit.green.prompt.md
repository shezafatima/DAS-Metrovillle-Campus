---
id: 0014
title: Social URL slots, active tagline, nav-fit regression
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: [content, fidelity, active-state, responsive, bugfix]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/content/site-shell.ts
 - src/components/site-shell/nav-desktop.tsx
 - src/components/site-shell/nav-mobile.tsx
 - src/components/site-shell/header.tsx
 - src/components/site-shell/search-box.tsx
tests:
 - npm test (Vitest) — 9 files, 41 tests, all passing
 - npm run test:e2e (Playwright, chromium) — 50/52 passing, 1 intentionally skipped, 1 confirmed-flaky (unrelated) test
 - npx tsc --noEmit — clean
---

## Prompt

"leave space for url I will add later bymyself what I think is that I am
unable to see any social icon on the top bar also once again view the
topbar.png file as well as step 2 in navbar the link which is active is
blue so their subheading text on active will also be blue"

(Followed mid-turn by: "don't make subheading nav text much bigger the
previous size was perfect don't minimize the logo as well" — a correction
to an in-progress fix attempt, addressed in the same turn.)

## Response snapshot

1. **Social icon slots** — `contactInfo.social` was `{}`; no icons show
   because no URLs are configured (working as designed, FR-12), not a
   bug. Changed to explicit empty-string keys for all four platforms
   (`facebook`, `youtube`, `instagram`, `tiktok`) so the user can paste a
   URL directly between the quotes without adding new keys — an empty
   string still correctly omits the icon until filled in.
2. **Active tagline color** — the bold label already turned `text-primary`
   for the current page, but its tagline stayed muted gray regardless.
   Fixed in both `NavDesktop` and `NavMobile` so the tagline matches the
   label's active state.
3. **Nav-fit regression** — viewing `topbar.png` (a new reference
   screenshot) while checking the tagline fix surfaced a real bug: at
   1024px "CONTACT" wraps to a second line. Root cause, found via
   precise measurement (summing each nav item's real width + gaps) rather
   than guessing: total nav content needs ~861px at 1024px but only ~754px
   is available — a genuine ~107px shortfall, mostly because "Resources"
   sub-nav item's *tagline* ("Gallery & Download") is wider than its own
   label, and the newly-added search icon further eats into the shared
   width budget. First attempts shrunk the logo and tightened gaps, but
   the user explicitly ruled out touching logo size or tagline text size
   mid-turn. Correct fix: hide taglines *only* at the 1024–1279px window
   (`hidden xl:block`) — same size everywhere they do show, labels alone
   already fit comfortably at that one tight breakpoint — combined with
   shrinking the search icon's own padding/icon size (which doesn't touch
   logo or tagline) and restoring the nav item gap back to its original,
   comfortable `gap-4 xl:gap-6`. Verified at 1024, 1280, and 1440px: no
   wrapping at any of the three, full tagline+label at 1280+.

## Outcome

- ✅ Impact: social platforms are one paste away from going live; active
  nav items are fully blue (label + tagline); the header no longer wraps
  at any desktop width from 1024px up, without shrinking the logo or
  tagline text as instructed.
- 🧪 Tests: Vitest 41/41; Playwright 50/52 (1 skip by design, 1
  pre-existing unrelated flake — confirmed flaky repeatedly this session);
  tsc clean.
- 📁 Files: site-shell.ts, nav-desktop.tsx, nav-mobile.tsx, header.tsx,
  search-box.tsx.
- 🔁 Next prompts: paste real social URLs into `contactInfo.social` in
  `src/content/site-shell.ts` whenever ready — nothing else to change.
- 🧠 Reflection: `scrollWidth`/`clientWidth` on an already-wrapped
  flex-wrap container are misleading — they read as equal once wrapping
  has already happened, masking the real shortfall. Summing each item's
  actual rendered width plus gaps gave the true single-line requirement
  and made the fix targeted instead of trial-and-error.

## Evaluation notes (flywheel)

- Failure modes observed: an initial fix attempt (shrinking logo/gaps)
  was course-corrected by the user mid-turn before being finalized —
  addressed by finding a fix that didn't touch either constrained lever.
- Graders run and results (PASS/FAIL): Vitest PASS, Playwright PASS
  (aside from the pre-existing unrelated flake), tsc PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

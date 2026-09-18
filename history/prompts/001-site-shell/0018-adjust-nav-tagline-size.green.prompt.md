---
id: 0018
title: Adjust nav tagline size to reference
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: ["css", "tailwind", "nav", "design-tokens"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - src/app/globals.css
tests:
 - vitest run src/components/site-shell/nav-desktop.test.tsx src/components/site-shell/nav-mobile.test.tsx (14 passed)
---

## Prompt

here is what I want navbar subtext will not be too big or too small you maked it too small [Image #1: reference screenshot of das.edu.pk header, attached at C:\Users\skytech laptopstore\Pictures\Screenshots\Screenshot 2026-09-17 113236.png — shows "HOME / Front Page", "ABOUT / Who We are?", etc. with the tagline line clearly legible under each bold caps label, roughly two-thirds its size]

## Response snapshot

`--text-nav-tagline` was 8px with a 2px line-height (from an earlier, now-cleared conversation turn) — the 2px line-height in particular collapses the line box far below the glyph height, which is likely why it read as "too small"/squished rather than merely small. Compared the user's reference screenshot against the built header: the tagline ("Front Page", "Who We Are?", etc.) needed to be clearly legible, noticeably smaller than the bold caps label above it but not razor-thin.

Raised `--text-nav-tagline` to 12px and `--text-nav-tagline--line-height` to 16px in src/app/globals.css (up from 8px/2px). No source data exists for this token in research/tokens/*.json (the scraper only captured the outer link element's style, not the nested tagline span — documented as a known extraction gap in the surrounding comment), so this is a visual-match judgment call, not a captured ground-truth value. Re-screenshotted the running dev server's header at 1440px and confirmed the tagline now reads at proportions matching the reference image.

## Outcome

- ✅ Impact: Desktop nav tagline ("Front Page", "Who We Are?", etc.) is now legible and proportioned to match the reference screenshot instead of being squished at 8px/2px.
- 🧪 Tests: nav-desktop and nav-mobile vitest suites pass (14 tests) — value change only, no markup/class changes.
- 📁 Files: src/app/globals.css (`--text-nav-tagline`, `--text-nav-tagline--line-height`).
- 🔁 Next prompts: none pending; flag if the tagline still needs fine-tuning once the user reviews in-browser.
- 🧠 Reflection: This token has no scraped ground truth (documented gap) — future adjustments to it are inherently a visual-match call against screenshots, not a lookup.

## Evaluation notes (flywheel)

- Failure modes observed: none — straightforward value tuning against a user-supplied reference image.
- Graders run and results (PASS/FAIL): vitest nav-desktop/nav-mobile — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): if the user still isn't satisfied, get an actual computed-style capture of the live das.edu.pk tagline span (not just the outer link) to replace the visual-match guess with real data.

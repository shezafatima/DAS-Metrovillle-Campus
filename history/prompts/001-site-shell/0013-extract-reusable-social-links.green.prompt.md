---
id: 0013
title: Extract reusable social links component
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: [refactor, social-links, reusable-component]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/content/site-shell.ts
 - src/components/site-shell/social-links.tsx
 - src/components/site-shell/social-links.test.tsx
 - src/components/site-shell/top-bar.tsx
 - src/components/site-shell/footer.tsx
 - specs/001-site-shell/data-model.md
 - specs/001-site-shell/contracts/content-schema.md
tests:
 - npm test (Vitest) — 9 files, 41 tests, all passing
 - npm run test:e2e (Playwright, chromium) — 50/52 passing, 1 intentionally skipped, 1 confirmed-flaky (unrelated) test
 - npx tsc --noEmit — clean
---

## Prompt

"lets move on to top header social icons create seperate reusable
compoenet for this links will include "facebook , youtube , insta ,
tiktok " also checkout the top header screenshot for reference"

## Response snapshot

Cropped the social-icon area out of `screenshots/Search-popout.png` (a
reference image the user had added earlier) to confirm the exact visual
style: white rounded-square badges with navy icons on the yellow top bar.
Found real duplication to fix along the way — `TopBar` and `Footer` each
had their own near-identical `socialEntries` filtering, `SOCIAL_LABELS`
dict, and icon-rendering JSX (with different badge styling: white/rounded
on the top bar, dark/circular in the footer).

Extracted a single `SocialLinks` component (`social-links.tsx`) that both
now use via a `variant="light" | "dark"` prop, consolidating the
omit-when-empty filtering (FR-012) and label mapping into one place.
Updated `SocialPlatform` (in `site-shell.ts`) from `facebook | instagram |
youtube | linkedin` to `facebook | instagram | youtube | tiktok` per the
user's explicit list. Since lucide-react ships no brand icons at all in
this locked version (confirmed again — no `Facebook`/`Youtube`/
`Instagram`/`TikTok` exports, Constitution II blocks a new icon
dependency), each platform gets a distinct *generic* lucide icon evocative
of it rather than one indistinguishable generic icon for all four:
`ThumbsUp` (Facebook), `Play` (YouTube), `Camera` (Instagram), `Music2`
(TikTok) — each still carries a screen-reader label naming the real
platform, so nothing is misrepresented as an actual brand mark.

## Outcome

- ✅ Impact: One reusable, tested `SocialLinks` component backs both the
  top bar and footer's social icons, matching the reference's white/dark
  badge styles; the four supported platforms match what the user asked
  for exactly.
- 🧪 Tests: Vitest 41/41 (5 new tests in `social-links.test.tsx` covering
  empty state, per-platform omission, all-four rendering, and both badge
  variants); Playwright 50/52 (1 skip by design — still no real social
  URLs supplied — 1 pre-existing unrelated flake); tsc clean.
- 📁 Files: see list above.
- 🔁 Next prompts: still waiting on the real Facebook/YouTube/Instagram/
  TikTok URLs for `contactInfo.social` in `src/content/site-shell.ts` —
  everything downstream is now built, tested, and doc-synced.
- 🧠 Reflection: The duplication between `TopBar` and `Footer` existed
  because social-icon rendering was added to each independently in
  earlier turns rather than planned as shared from the start — worth
  checking for an existing sibling implementation before adding a second
  copy of near-identical rendering logic, even under time pressure.

## Evaluation notes (flywheel)

- Failure modes observed: none in the delivered refactor.
- Graders run and results (PASS/FAIL): Vitest PASS, Playwright PASS
  (aside from the pre-existing unrelated flake), tsc PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

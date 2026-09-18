---
id: 0017
title: Fix nav text size and add social URLs
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: ["bugfix", "css", "tailwind", "nav", "content"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - src/components/site-shell/nav-desktop.tsx
 - src/components/site-shell/nav-mobile.tsx
 - src/content/site-shell.ts
tests:
 - vitest run src/components/site-shell/nav-desktop.test.tsx src/components/site-shell/nav-mobile.test.tsx (14 passed)
 - vitest run src/components/site-shell/social-links.test.tsx src/components/site-shell/top-bar.test.tsx (9 passed)
---

## Prompt

still the nav text is big

(mid-turn follow-up): also here are the social link insta : "https ..instagram.com/darearqam_metroville" , facebook : "https://www.facebook.com.arqam.metroville" , tiktok : "tiktok.com/@dar_e_arqam_metroville?_r=1&_t=ZS-99ni7RfvwS"

## Response snapshot

Root-caused the oversized main-menu text: `nav-desktop.tsx`'s label and tagline spans passed a bare `text-nav` / `text-nav-tagline` class into `cn()` alongside a `text-primary`/`text-text` color class. The `cn` package (shadcn's tailwind-merge-like runtime) doesn't know this project's custom `@theme` text-size scale, so it bucketed both unrecognized `text-*` classes into the same conflict group and silently dropped the earlier one — confirmed via Playwright: the rendered `className` was missing `text-nav` entirely, leaving the element on the browser's default 24px line-height instead of the token's 16px/16px. Verified against research/tokens/home-1440.json's `mainMenuItem` sample (16px/16px line-height/700/1px letter-spacing) as ground truth.

Fixed by switching the font-size/line-height pair to Tailwind's explicit arbitrary-variable syntax (`text-(length:--text-nav)` + `leading-(--text-nav--line-height)`), which `cn()` classifies unambiguously into the font-size/leading groups (same reasoning already applied to `tracking-(--text-nav--letter-spacing)` in the existing code). Applied to nav-desktop.tsx's label span and tagline span, and nav-mobile.tsx's tagline span (the only other spot combining a custom text-size class with a color class inside the same `cn()` call). Re-verified with Playwright: computed line-height now reads 16px, matching the reference site.

Also filled in the previously-empty social URLs in `contactInfo.social` (src/content/site-shell.ts): Instagram and TikTok as given (normalized to full https URLs), Facebook corrected per user confirmation (`facebook.com.arqam.metroville` → `facebook.com/arqam.metroville`, the dot was a typo for a slash). YouTube remains an empty placeholder.

## Outcome

- ✅ Impact: Desktop/mobile nav menu text now renders at the correct 16px/16px (font-size/line-height) instead of an inflated 24px line-height; Facebook/Instagram/TikTok icons now link to real profiles instead of being hidden as empty placeholders.
- 🧪 Tests: vitest suites for nav-desktop, nav-mobile, social-links, top-bar all pass (23 total).
- 📁 Files: src/components/site-shell/nav-desktop.tsx, src/components/site-shell/nav-mobile.tsx, src/content/site-shell.ts.
- 🔁 Next prompts: Confirm/obtain a real YouTube URL if one exists; visually re-check mobile drawer nav sizing.
- 🧠 Reflection: The `cn()`/tailwind-merge collision between custom `text-{size}` and `text-{color}` theme tokens is a latent trap anywhere both are combined inside one `cn()` call — worth a lint/grep sweep if more custom text-scale tokens are added later.

## Evaluation notes (flywheel)

- Failure modes observed: silent class-drop from a JS-level classname merge utility (not a CSS cascade bug) — invisible without inspecting the live `className` string or computed styles.
- Graders run and results (PASS/FAIL): vitest nav-desktop/nav-mobile/social-links/top-bar — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): grep the codebase for other `cn()` calls combining a bare custom `text-*` size token with a `text-*` color token, to catch any remaining instances (dropdown child link in nav-desktop.tsx and search-box.tsx use plain className strings, not cn(), so they were unaffected).

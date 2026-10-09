---
id: 0008
title: Full-height hero and remove Find Us Nearby
stage: general
date: 2026-10-07
surface: agent
model: claude-sonnet-5-5
feature: none
branch: 012-careers
user: shezafatima
command: layout change request (report first, then implement)
labels: ["home", "hero", "lcp", "picture", "admin-hint"]
links:
  spec: specs/006-home-page/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/components/home/hero-slider.tsx, src/app/(public)/page.tsx, src/app/globals.css
 - src/content/home.ts, src/content/admin.ts, src/lib/settings/groups/hero.ts
 - removed src/components/home/find-us-nearby.tsx and its five design tokens
 - e2e/admin-home-page.spec.ts
 - specs/006-home-page (spec, contracts, data-model), docs/architecture.md
tests:
 - vitest (93 passed); playwright admin-home-page 19/19, admin-home-layout 2/2
---

## Prompt

Home page: remove "Find Us Nearby"; hero at full viewport height (100svh, under the fixed header, scroll cue, check cropping at four widths). Report first (Settings fields, E2E specs, LCP; flag PRD §5.1). Answers: admin hint plus visual checks, no focal point, and fix the mobile-image fallback; remove the five dead tokens; chevron-down cue; header top padding, dots above the cue, 100vh fallback, 006 deviation row and spec/contracts/architecture updates; measure LCP and fix the double preload with `<picture>`.

## Response snapshot

Implemented as asked. A slide with no mobile picture is fitted whole (object-contain) on phones and portrait screens instead of cropped. One `<picture>` per slide (getImageProps + fetchPriority high), so each device downloads one file. Measured on production builds with simulated slow images: hero image ready 1100 → 762 ms at 375px and 368 → 226 ms at 1440px. Chrome does not report a full-viewport image as an LCP candidate (bisected), so LCP itself no longer tracks the hero image.

## Outcome

- ✅ Impact: Find Us Nearby gone; full-height hero with scroll cue; mobile-fallback and double-download fixed.
- 🧪 Tests: see front matter.
- 📁 Files: see front matter.
- 🔁 Next prompts: the navy logo over navy letterbox/dark slides; PRD §5.1 update by the owner.
- 🧠 Reflection: LCP is the wrong metric for a viewport-sized hero image; track image-ready time instead.

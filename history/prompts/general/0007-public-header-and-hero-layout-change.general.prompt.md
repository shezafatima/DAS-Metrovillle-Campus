---
id: 0007
title: Public header and hero layout change
stage: general
date: 2026-10-07
surface: agent
model: claude-sonnet-5-5
feature: none
branch: 012-careers
user: shezafatima
command: layout change request (report first, then implement)
labels: ["header", "hero", "layout", "nav", "footer"]
links:
  spec: specs/006-home-page/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/components/site-shell/header-frame.tsx (new; replaces header-scroll-collapse.tsx)
 - src/components/site-shell/header.tsx, logo.tsx, nav-desktop.tsx, nav-mobile.tsx, search-box.tsx, footer.tsx
 - src/components/home/hero-slider.tsx
 - src/content/site-shell.ts, src/content/home.ts, src/lib/site-search.ts, src/app/globals.css
 - removed top-bar.tsx and top-bar.test.tsx
 - e2e/header-scroll, desktop-navigation, shell-careers-links, contact-and-social, admin-home-page specs
 - specs/006-home-page/spec.md, specs/001-site-shell/spec.md
tests:
 - vitest site-shell, content, site-search, home (64 passed)
 - playwright header-scroll 12/12; desktop-navigation, shell-careers-links, mobile-navigation pass except noted stale ones
---

## Prompt

Public site layout change (admin untouched, no new tokens): remove the yellow top bar; Careers into the About dropdown (kept in footer); no taglines; smaller logo; centred nav; header transparent over the home hero with a dark scrim then solid on scroll (solid elsewhere); hero without prev/next buttons and with a slide transition (dots kept); fix the white gap and the 1px page-height flip. Report first (specs affected, mobile menu, constitution/spec constraints, PRD §8). Then answers: portal links and social to the footer; sticky at all widths; solid on every page except home; white variant of the logo (later reversed: "not white logo the exact previous logo"); footer Careers unchanged; later: "make the logo a little bit increase".

## Response snapshot

Report first, then implemented: fixed-height sticky header (HeaderFrame) so scroll never changes page height; transparent only on `/`; scrim; Careers added to About children; portal links in a footer nav; slide transition with dots only. Documented the deviation in the 006 spec and noted 001 FR-016/FR-025 as amended.

## Outcome

- ✅ Impact: header and hero changed as asked; PRD §8 flagged for the owner to update.
- 🧪 Tests: see front matter. Stale/unrelated failures: footer.spec (2), contact-and-social phone/email/address (3), site-search mobile (strict-mode locator).
- 📁 Files: see front matter.
- 🔁 Next prompts: decide how the navy logo should read over a dark hero.
- 🧠 Reflection: the exact (navy) logo has low contrast over dark slides.

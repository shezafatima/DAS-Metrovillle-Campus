---
id: 0009
title: Commit home page files separately
stage: misc
date: 2026-10-06
surface: agent
model: claude-sonnet-5-5
feature: 006-home-page
branch: 012-careers
user: shezafatima
command: direct request
labels: ["git","commit","home-page"]
links:
  spec: specs/006-home-page/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/components/home/
 - src/content/home.ts
 - src/app/(public)/page.tsx
 - specs/006-home-page/
 - e2e/admin-home-page.spec.ts
tests:
 - none run for this commit (typecheck was clean and the home unit tests passed earlier in the session; the 006 E2E specs have still not been run)
---

## Prompt

commit the 006 files as their own commit, separate from the signup removal.

## Response snapshot

One commit of the 006 work: home components, content, page, news latest reader, specs, E2E specs and helpers, research extraction scripts and tokens, images, header/shell changes, design tokens, architecture notes. It includes the shared E2E_FRESH_READS rename (src/lib/e2e-fresh-reads.ts used by settings, news and gallery readers, playwright.config.ts) because splitting it would break the gallery reader. Left out: research/_hdr2.ts (scratch script) and the small test-stability edits to admin-gallery-albums, admin-gallery-public and admin-settings-layout specs (005/007 work). The signup removal was already committed as 211cf86.

## Outcome

- Impact: the working tree is clear of 006 work; 012-careers now builds from a checkout.
- Next prompts: run the 006 E2E specs; finish 007; merge 012.
- Reflection: the 006 E2E specs (admin-home-page, admin-home-layout) were committed unrun.

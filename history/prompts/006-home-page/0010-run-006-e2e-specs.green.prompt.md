---
id: 0010
title: Run 006 home page E2E specs
stage: green
date: 2026-10-06
surface: agent
model: claude-sonnet-5-5
feature: 006-home-page
branch: 012-careers
user: shezafatima
command: direct request
labels: ["e2e","home-page","verification"]
links:
  spec: specs/006-home-page/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - e2e/home.spec.ts
tests:
 - e2e/admin-home-page.spec.ts + admin-home-layout.spec.ts (admin project, 14/14)
 - e2e/header-scroll.spec.ts (3/3), e2e/home.spec.ts (1/1 after update)
---

## Prompt

run the 006 E2E specs

## Response snapshot

Ran on a warm second dev server (port 3100, test database, E2E_FRESH_READS=1), one worker. admin-home-page and admin-home-layout: 14/14 pass. header-scroll: 3/3. The old 001 smoke test e2e/home.spec.ts failed because it looked for the placeholder heading "Home" that 006 replaced; it now checks banner, a single h1 and footer (1/1). Not run: the rest of the chromium and admin suites.

## Outcome

- Impact: the 006 specs that were committed unrun now pass; one stale 001 spec fixed.
- Next prompts: finish 007 gallery albums; T098 and signup backup/retire; merge 012.

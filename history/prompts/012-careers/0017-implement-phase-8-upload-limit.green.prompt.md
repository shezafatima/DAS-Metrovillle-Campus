---
id: 0017
title: Implement Phase 8 upload limit
stage: green
date: 2026-10-05
surface: agent
model: claude-sonnet-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: /sp.implement Phase 8
labels: ["implement","careers","rate-limit","honeypot","home-cta"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/lib/public-form.ts
 - src/app/api/public/careers/route.ts
 - src/app/api/public/careers/route.test.ts
 - e2e/careers-protection.spec.ts
 - specs/012-careers/tasks.md
 - src/app/globals.css
 - src/components/home/careers-cta.tsx
tests:
 - src/app/api/public/careers, rate-limit (unit, 32 pass)
 - e2e/careers-protection.spec.ts (2/2, forms project)
 - src/components/home/careers-cta.test.tsx (2/2)
---

## Prompt

Phase 8

(earlier in the same session) before commiting 7 make the button on hover blue to instead yellow make corner round not full round then commit 7
(mid-run) i said yellow button on hover what you done is skyblue
(mid-run) it's not the theme yellow

## Response snapshot

T079-T081 done: extractIp exported; the careers POST counts uploads per address (10 per 24 h, key form:careers-upload:ip:<ip>) after the submission limit and before validation or any store call, 429 with Retry-After; only requests with a file part count. Unit tests for the 6th submission, 11th upload (no new file stored), per-address counters; E2E honeypot (confirmation, nothing stored) and rate-limit alert with typed values kept. Join Now button: hover is now the site's gold highlight (--color-signup-highlight, #ffd700) with dark text, radius 6px, via home-only tokens. An earlier first run had one 12 s database stall (503) that did not repeat.

## Outcome

- Impact: upload abuse budget in place; Phase 8 complete.
- Tests: see above
- Next prompts: Phase 9 retention, Phase 10 signup removal, Phase 11 polish
- Reflection: misread "blue to instead yellow" twice; the theme yellow is the signup gold.

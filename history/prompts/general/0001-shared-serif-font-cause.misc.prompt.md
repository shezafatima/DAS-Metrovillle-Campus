---
id: 0001
title: Shared cause of the serif error text
stage: misc
date: 2026-10-07
surface: agent
model: claude-sonnet-5-5
feature: none
branch: 012-careers
user: shezafatima
command: direct request
labels: ["fonts","globals-css","forms"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - src/app/globals.css
 - src/app/globals.css.test.ts
 - src/components/careers/careers-form.tsx
tests:
 - src/app/globals.css.test.ts, src/components/careers, src/components/contact (25 pass)
 - computed font-family measured in Chrome on /careers, /contact, /admin/login after the fix
---

## Prompt

Two fixes before 007: 1. Error text is in a serif font on both the careers form and the contact form. Find the shared cause rather than patching each form separately ... Check whether it's a missing font token or a class that isn't inheriting. 2. The header's scroll-shrink leaves a white gap when scrolling starts. Investigate and fix ... Show me what you find before changing the header, since that's 006 design work.

(this entry covers fix 1 only)

## Response snapshot

Cause: globals.css line 10 declared --font-sans: var(--font-sans), a custom property that refers to itself. That is invalid at computed time (it computed to an empty string), and html uses font-sans, so html and body had no font-family and the browser used its default serif (computed: Times New Roman). Every element without its own font-* class (the error chips, any new form text) was serif; text with font-body/heading/button classes was fine, which hid it. Introduced in 001. It is a missing/invalid token, not a class failing to inherit. Fix: --font-sans now points at --font-body, so the page-wide default is the site body font; the per-form font-body patch from the walkthrough was reverted. Guard: globals.css.test.ts fails on any custom property that refers to itself and checks font-sans points at a defined token. Measured after: html and body are the softLINKS/Arial stack on /careers, /contact and /admin/login (the admin theme sets its own font, unchanged). Side effect: any other text that relied on the serif fallback is now Arial; none known.

## Outcome

- Impact: new forms get the body font by default; error text no longer serif on any form.
- Next: header findings reported separately (no header change made yet).

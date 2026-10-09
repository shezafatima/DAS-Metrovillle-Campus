---
id: 0002
title: Dev 404s and hydration warning
stage: misc
date: 2026-10-07
surface: agent
model: claude-sonnet-5-5
feature: none
branch: 012-careers
user: shezafatima
command: direct request (pasted dev server output)
labels: ["dev-server","hydration","turbopack","404"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - src/app/layout.tsx
tests:
 - tsc --noEmit (clean)
 - logged in as the E2E admin on a second dev server: /admin/messages/<id> 200 (the "no longer available" notice), /admin/settings/contact 200
---

## Prompt

(pasted) a Turbopack panic "Restore of All for task ... failed in another thread" -> "first fix it"
(pasted) GET /admin/settings/contact 404 (x3)
(pasted) GET /admin/messages/6ab9ead5872cc6c7a8bbb3c4 404 (x2) and a React hydration-mismatch warning listing body attributes cz-shortcut-listen, data-new-gr-c-s-check-loaded, data-gr-ext-installed

## Response snapshot

Panic: the Turbopack dev cache (.next/dev) was corrupted; deleted it (generated, gitignored), restarted, pages compile. Hydration warning: the removed attributes belong to browser extensions (ColorZilla, Grammarly) that edit <body> before React loads; added suppressHydrationWarning to <body> (that element only). 404s: not reproduced. With the committed code on a second server (Turbopack, test database) both URLs answer 200 for a logged-in admin; the messages detail page never returns 404 itself (a missing message renders a notice with 200), the proxy cannot produce a 404, and a missing permission redirects. The user's dev server on port 3000 is a different process from the one started in this session, so its log and database were not visible. Likeliest cause is that server's stale dev state right after the cache rebuild; needs a restart and, if it persists, the first 404 with the page they clicked from.

## Outcome

- Impact: the hydration noise is gone; the 404s are open pending the user's restart/repro.

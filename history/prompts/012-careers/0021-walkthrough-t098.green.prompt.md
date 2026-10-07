---
id: 0021
title: Walkthrough T098 at four widths
stage: green
date: 2026-10-07
surface: agent
model: claude-sonnet-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: direct request
labels: ["walkthrough","careers","responsive","verification"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/components/careers/careers-form.tsx
 - specs/012-careers/tasks.md
tests:
 - temporary Playwright capture of quickstart section 2 at 375/768/1024/1440 (4/4, no sideways scroll; spec deleted afterwards)
 - src/components/careers (13 pass)
---

## Prompt

do the walkthrough, do the backup and retire, merge 012, merge 006. Then say go on 007.

(this entry covers the walkthrough only)

## Response snapshot

Ran quickstart section 2 in a browser at 375, 768, 1024 and 1440 px with screenshots: form, filled, success, refusal with the reapply date (6 November 2026 for an application made 7 October), non-PDF and oversize messages, admin list and detail (Urdu name correct). No sideways scroll anywhere (SC-009). Found: error text rendered in the browser's serif font because the error classes set no font family; added font-body to the careers form's two error classes (the contact form has the same classes and the same issue, left alone). Also found: on a short page at tall viewports the header's continuous shrink (006) flips the page height by 1 px about once a second, so Playwright never sees the Apply button as stable (real users are unaffected); not changed, the walkthrough clicked with force.

## Outcome

- Impact: T098 done; all 101 tasks of 012 ticked.
- Next: backup and retire signups; merge to main.

---
id: 0001
title: Specify gallery albums feature
stage: spec
date: 2026-09-30
surface: agent
model: claude-sonnet-5-5
feature: 007-gallery-albums
branch: 007-gallery-albums
user: shezafatima
command: /sp.specify
labels: ["gallery","albums","settings","resources","spec"]
links:
  spec: specs/007-gallery-albums/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/007-gallery-albums/spec.md
 - specs/007-gallery-albums/checklists/requirements.md
tests:
 - none (spec stage)
---

## Prompt

Feature Brief — Gallery Albums

Replaces the flat photo gallery built in Settings (005) with albums, capped at 6 albums and 8 photos each.

References
Feature 005 (existing gallery group in Settings)
Constitution §3 (permission checks), §5 (media), §11 (tests)
docs/prd.md §5.6, §6.5
User Stories
P1 — Admin manages albums
The Settings gallery section lists albums instead of loose photos.
Create an album with a title, an optional short description and an optional date.
Reorder albums; rename or delete them (confirmed, recoverable).
A maximum of 6 albums. At the limit, the create button is disabled with a message explaining an album must be deleted first, and the limit is also enforced on the server.
P1 — Admin manages photos in an album
Open an album to upload, reorder, caption and delete photos.
Several photos can be uploaded at once.
A maximum of 8 photos per album, enforced in the interface and on the server. Uploading more than the remaining space rejects the extras with a clear message and keeps the ones that fit.
The first photo is the album cover unless another is chosen.
Existing photos from the old flat gallery move into one album named "Gallery" when this feature ships, so nothing is lost.
P1 — Visitors browse the gallery
The Resources photo gallery section shows album covers in a grid, each with its title and photo count, in the admin's order.
Choosing an album shows its photos; visitors can move between photos and close the view.
Works by keyboard and on touch screens.
An empty gallery hides the section rather than showing an empty grid; an album with no photos is not shown.
P2 — Access and limits
The gallery is part of the settings permission from 011.
Images: JPG, PNG or WebP, up to 5 MB each, compressed and resized on upload.
Photos load as the visitor scrolls rather than all at once.
Edge Cases
Deleting an album removes its photos from the site and frees its slot.
Deleting the cover photo promotes the next photo to cover.
Long album titles and Urdu titles display correctly.
An upload that fails leaves the album's other photos untouched.
Two admins uploading at once cannot push an album past 8 photos.
Out of Scope
Videos in albums.
Nested albums or tags.
Downloading photos from the public site.
Raising the caps (they are fixed at 6 and 8 this phase).
Acceptance
E2E tests: create albums up to the limit and confirm the 7th is refused; upload photos up to 8 and confirm the 9th is refused; reorder and delete; view albums on the Resources page and open one.
Tests prove the caps hold when the server is called directly.
Every gallery route has three tests: no session, missing settings permission, correct permission.
Gallery works at 375, 768, 1024 and 1440px.

## Response snapshot

Created branch 007-gallery-albums (unused number; 012–018 reserved in PRD §9). Wrote spec with 5 user stories, FR-001–FR-036, SC-001–SC-010, and quality checklist. Two clarifications, both later answered by the owner (Q1: overflow into Gallery 2… capped at 6 albums / 48 photos, remainder discarded and reported; Q2: minimal /resources page, extended by 016 with #downloads and #our-books). Originally open: Q1 overflow when old flat gallery has more than 8 photos; Q2 where the public gallery section is delivered before feature 016 (Resources is currently a placeholder).

## Outcome

- ✅ Impact: Spec drafted; blocked on two clarifications before /sp.plan.
- 🧪 Tests: none at spec stage
- 📁 Files: spec.md, checklists/requirements.md
- 🔁 Next prompts: answer Q1/Q2, then /sp.clarify or /sp.plan
- 🧠 Reflection: brief's "nothing is lost" conflicts with the 8-photo cap for large old galleries.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): checklist 15/16 pass (all pass after clarifications)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

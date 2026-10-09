---
id: 0003
title: Plan gallery albums
stage: plan
date: 2026-09-30
surface: agent
model: claude-opus-5-5
feature: 007-gallery-albums
branch: 007-gallery-albums
user: shezafatima
command: /sp.plan
labels: ["gallery","albums","plan","concurrency","migration"]
links:
  spec: specs/007-gallery-albums/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/007-gallery-albums/plan.md
 - specs/007-gallery-albums/research.md
 - specs/007-gallery-albums/data-model.md
 - specs/007-gallery-albums/quickstart.md
 - specs/007-gallery-albums/contracts/gallery-actions.md
 - specs/007-gallery-albums/contracts/access-matrix.md
 - specs/007-gallery-albums/contracts/public-gallery.md
 - CLAUDE.md
tests:
 - none (plan stage)
---

## Prompt

/sp.plan (no arguments)

## Response snapshot

Planned the gallery as one `settings/_id:"gallery"` document (schema 2) with embedded albums and photos. Version compare-and-set with a retry loop enforces the 6/8 caps under concurrency, and a per-album rev gives detail-edit conflicts. There are 9 immediate-save Server Actions under the `settings` permission. The 005 signed upload is reused, with one addGalleryPhotos call per selection that keeps what fits and deletes refused assets. A pure idempotent migration (release script `npm run migrate:gallery` plus a lazy fallback) caps at 48 photos and reports the count not migrated. The flat gallery group is removed from the Settings engine. Public side: a minimal /resources with a #photo-gallery section, /resources/gallery/<12-char id> album pages, and a Dialog-based viewer. The menu link is updated and /resources/photo-gallery redirects. The constitution check passes. ADR suggested (not created).

## Outcome

- ✅ Impact: plan and Phase 0/1 artifacts ready for /sp.tasks
- 🧪 Tests: none at plan stage; test strategy defined in plan and quickstart
- 📁 Files: plan, research, data-model, quickstart, 3 contracts, CLAUDE.md agent context
- 🔁 Next prompts: /sp.adr gallery-albums-single-document-cas (optional), /sp.tasks
- 🧠 Reflection: the existing site-shell menu pointed Photo Gallery at /resources/photo-gallery, which conflicts with the #photo-gallery anchor; resolved with a menu change plus a redirect.

## Evaluation notes (flywheel)

- Failure modes observed: a multi-file bash heredoc failed to parse on Windows; switched to the Write tool.
- Graders run and results (PASS/FAIL): constitution check PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

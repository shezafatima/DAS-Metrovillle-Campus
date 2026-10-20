---
id: 0009
title: Implement Academics page
stage: green
date: 2026-10-12
surface: agent
model: claude-sonnet-5-5
feature: 018-academics
branch: 018-academics
user: shezafatima
command: /sp.implement
labels: ["academics", "implement", "video-embed", "redirects", "e2e"]
links:
  spec: specs/018-academics/spec.md
  ticket: null
  adr: history/adr/0010-shared-click-to-load-video-block.md
  pr: null
files:
 - docs/content-source/academics/ (docx copies, txt extractions, README, client-review)
 - src/lib/content/, src/lib/content-mode.ts, src/lib/video/embed.ts, src/lib/academics/
 - src/content/academics/, src/components/academics/, src/components/media/video-embed.tsx
 - src/app/(public)/academics/page.tsx, src/content/site-shell.ts, next.config.ts
 - src/components/about/about-section.tsx, src/components/home/inspiration-why-choose.tsx
 - e2e/academics.spec.ts, e2e/page-sections.spec.ts, e2e/site-search.spec.ts
tests:
 - vitest (fields, content-mode, video embed, academics schema/view/content/fidelity, components)
 - playwright e2e/academics.spec.ts (45 passed), page-sections, site-search
---

## Prompt

/sp.implement (no extra input). Mid-run owner messages: yellow stroke under Academics headings; Instagram reel links for Teachers' Training and Hifz; reduce white space between sections; shorten the Teachers' Training text; videos not visible; put text on one side and video on the other; training images added but not shown; keep images, video and text in a proper structure.

## Response snapshot

Implemented tasks.md Phases 1-8. Shared helpers moved out of About, new video parser and shared VideoEmbed (home switched, old component deleted), Academics schemas/content/components/page, nav and redirect map, test seam cookie, E2E for US1-US5 plus axe. Owner changes applied: yellow pencil stroke and compact spacing via AboutSection options; both videos are Instagram reels; Teachers' Training intro shortened (owner-approved deviation from verbatim, recorded as pending client approval); text/video side by side and the three supplied photos in an even row below (staggered collage and its token dropped).

## Outcome

- ✅ Impact: /academics live with three sections, videos, photos, redirects.
- 🧪 Tests: Academics unit and E2E green; npm run build passes with /academics static; 4 About fidelity tests fail on unchanged code (pre-existing); /news returns 500 locally (DB, pre-existing).
- 📁 Files: see list above.
- 🔁 Next prompts: client decisions in client-review.md; Academic Overview photo; video posters; confirm Instagram hosts (T060).
- 🧠 Reflection: the layout changed from the plan during review; tasks that assumed video below the text and a staggered collage were adapted.

## Evaluation notes (flywheel)

- Failure modes observed: bash heredocs with apostrophes failed once; use the Write tool for such files.
- Graders run and results (PASS/FAIL): see tests above.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

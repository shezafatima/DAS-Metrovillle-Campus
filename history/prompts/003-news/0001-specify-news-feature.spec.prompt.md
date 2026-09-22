---
id: 0001
title: Specify news feature
stage: spec
date: 2026-09-21
surface: agent
model: claude-opus-5
feature: 003-news
branch: 003-news
user: shezafatima
command: /sp.specify
labels: ["news", "spec", "admin", "public-site", "urdu", "images"]
links:
  spec: specs/003-news/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-news/spec.md
 - specs/003-news/checklists/requirements.md
 - history/prompts/003-news/0001-specify-news-feature.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

Feature Brief — 003 News

Admin news management plus the public news list and detail pages.

References
docs/prd.md §5.7, §6.3
screenshots/news-desktop.png, screenshots/news-mobile.png (TODO: replace with actual filenames)
research/design-tokens.md
Admin UI patterns built in 002 (table, form, dialog, toasts)
User Stories
P1 — Admin writes and publishes a news post
Create a post with: title, cover image, body (rich text: headings, bold, italic, lists, links), publish date, status (draft or published).
The web address (slug) is generated from the title and can be edited; it must be unique.
Save as draft without publishing; publish when ready; unpublish later.
Editing an existing post keeps its address unless changed by hand.
Clear success and error messages after each action.
P1 — Admin manages the list of posts
Table of all posts, newest first: cover thumbnail, title, status, publish date.
Search by title; filter by status.
Paginated when the list grows.
Delete asks for confirmation and is recoverable (soft delete); deleted posts disappear from the admin list and the public site.
P1 — Visitor reads the news
/news lists published posts only, newest first, paginated, with cover image, title, date and a short excerpt.
/news/[slug] shows the full post: title, date, cover image, body.
Unpublished, future-dated or deleted posts are not reachable; their addresses return "page not found".
Layout and styling match the reference screenshots.
P2 — Images
The admin uploads a cover image from their computer.
Oversized images are handled without breaking the layout; the public pages load appropriately sized versions.
A post without a cover image still displays correctly everywhere.
Each image has descriptive alternative text supplied by the admin.
P2 — Urdu support
Titles and body text in Urdu display in the correct direction and font, in the admin editor, the list and the public pages.
Mixed English and Urdu in one post displays correctly.
P3 — Sharing and discovery
Each post page has a title, description and preview image for search engines and social sharing.
The news list links from the site menu (already built in 001).
Categories (confirm before building)

docs/prd.md leaves categories open. If confirmed: each post has one category from a fixed list, shown as a label on the post and usable as a filter on the news list page. If not confirmed, leave categories out entirely rather than half-building them.

Edge Cases
Two posts given the same title still get different addresses.
Very long titles do not break the admin table or the cards.
A post with no body, or with only an image, is rejected with a clear message.
The public list shows a friendly empty state when nothing is published yet.
Leaving the editor with unsaved changes warns first.
An upload that fails does not lose the text already written.
Out of Scope
Comments, likes, view counts.
Scheduled auto-publishing (a future publish date simply stays hidden until that date).
Multiple authors or per-author attribution.
Newsletter sending.
Acceptance
E2E tests: create a draft, publish it, see it on the public list and detail page, unpublish it, confirm it disappears, delete it, confirm the address returns not found.
Tests prove every admin news route rejects unauthorized requests.
Tests prove drafts and deleted posts are never returned publicly.
Pages match the reference screenshots at 375, 768, 1024 and 1440px.

## Response snapshot

- Created branch `003-news` and `specs/003-news/spec.md` (7 user
  stories, 35 functional requirements, key entities, deviations,
  assumptions, out of scope, 8 success criteria).
- Resolved the brief's screenshot TODO to the actual files under
  `screenshots/` (`das.edu.pk_news_*.png` for list at three widths,
  per-category list pages, and an Urdu detail page).
- Reference screenshots show a category label on every card
  (Head Office, Events, Activities, Achievements, Announcements) and
  per-category list pages, so categories were kept as the single
  `[NEEDS CLARIFICATION]` (User Story 7 / FR-035) and presented to the
  user as Q1 with options: fixed list required / fixed list optional /
  no categories.
- Documented defaults: auto-derived 160-char excerpt, 9 public and
  20 admin posts per page, Urdu-preserving slugs with date fallback,
  slug uniqueness includes soft-deleted posts, JPEG/PNG/WebP ≤10 MB,
  no inline body images, page-based pagination instead of the
  reference's "Load more".
- Wrote `specs/003-news/checklists/requirements.md`; all items pass
  except the open clarification marker.

## Outcome

- ✅ Impact: Spec drafted and validated; one scope decision (categories) awaiting the user.
- 🧪 Tests: none (spec stage).
- 📁 Files: spec.md, checklists/requirements.md, this PHR.
- 🔁 Next prompts: answer Q1 on categories → spec updated → `/sp.clarify` or `/sp.plan`.
- 🧠 Reflection: Checking the reference screenshots turned an open PRD "TBD" into a concrete question with visible evidence, rather than guessing.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): spec quality checklist — PASS except the intentional clarification marker.
- Prompt variant (if applicable): none.
- Next experiment (smallest change to try): none.

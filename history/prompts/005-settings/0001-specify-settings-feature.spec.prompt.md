---
id: 0001
title: Specify settings feature
stage: spec
date: 2026-09-30
surface: agent
model: claude-opus-5-5
feature: 005-settings
branch: 005-settings
user: shezafatima
command: /sp.specify
labels: ["settings", "spec", "hero-slides", "contact", "gallery", "permissions"]
links:
  spec: specs/005-settings/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/005-settings/spec.md
 - specs/005-settings/checklists/requirements.md
 - history/prompts/005-settings/0001-specify-settings-feature.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

Feature Brief — 005 Settings

Admin-editable site content, organised in groups with fixed fields. Layout never changes; only the content inside it does.

References
docs/prd.md §6.5
Constitution §3 (permission checks) and §11 (three tests per admin route)
Shared permission check, right-hand panel and password/form patterns from 011
Admin UI patterns from 002 (form, table, dialog, toasts)
screenshots/home-desktop.png, screenshots/home-mobile.png for the hero (TODO: replace with actual filenames)
Design Principle

Each settings group is defined as a list of typed fields (text, long text, number, URL, image, video, list of items). The admin form for a group is generated from that definition, so adding a field later means adding it to the definition, not building a new screen.

User Stories
P1 — Access
Settings is a permission-gated section: a user without the settings permission cannot open its pages or call its routes.
Every settings page, route and action uses the shared permission check from 011.
P1 — Contact & social details
Admin edits campus phone, email, address, office timings, map location and social links (Facebook, Instagram, YouTube, etc.).
The header, footer and Contact page show the saved values.
Current values from the 001 and 008 content files become the starting values, so the live site looks unchanged after this feature ships.
An empty social link hides its icon on the site.
The Contact page keeps its current layout; only the source of the values changes.
P1 — Hero slides (images only)
Admin adds, edits, reorders (drag or up/down), hides and deletes slides.
Each slide has a desktop image, an optional separate mobile image and alt text.
Each slide optionally has a heading and a button (label + link).
Slides advance automatically after a set display time; visitors who prefer reduced motion get no auto-advance.
At least one visible slide is required; the admin cannot hide or delete the last one.
No video slides in this phase.
P1 — Stats
Admin edits students, books, teachers and campuses numbers.
Only whole, non-negative numbers are accepted.
P2 — Who We Are video (home page, third section)
Admin sets the YouTube address of the single video used on the home page.
Anything that is not a valid YouTube address is rejected.
Clearing it hides the video on the site without breaking the section.
P2 — Photo gallery
Admin uploads images, adds captions, reorders and deletes them.
Multiple images can be uploaded at once.
P2 — Saving and publishing
Each group saves independently with a clear success or error message.
Saved changes appear on the live site within a minute, without a redeploy.
Leaving a group with unsaved changes warns first.
Media Limits
Images: JPG, PNG or WebP, up to 5 MB each.
Anything outside these limits is rejected with a message stating the limit.
Visitors receive sizes and formats suited to their screen; mobile visitors get the mobile image when one is set.
No video files are uploaded anywhere in this feature.
Edge Cases
An upload that fails does not lose other unsaved edits in the group.
Deleting a slide or gallery image asks for confirmation and is recoverable (soft delete).
Very long headings or captions are limited to a maximum length that keeps the layout intact.
If settings cannot be loaded, the public site still renders using the last saved values or safe defaults, never an error page.
Out of Scope
Editing page text for About, Academics, Admission (feature 014 covers editable page content).
Adding, removing or reordering page sections.
Multiple sites or clients.
Wiring the hero, stats and video into the home page (feature 006 uses these settings; this feature provides and manages them). Exception: header and footer contact details switch to Settings here.
Acceptance
E2E tests: edit contact details and see them in the header and footer; add two slides, reorder them, hide one; update stats; set and clear the video URL; upload, reorder and delete gallery images.
Tests prove oversized or wrong-type uploads are rejected.
Every settings route has three passing tests: no session, missing settings permission, and correct permission.
Tests prove the last visible hero slide cannot be removed.

## Response snapshot

Created branch `005-settings` (from 011-roles-and-users, -Number 5 per PRD build order) and wrote `specs/005-settings/spec.md`: five settings groups (Contact & social, Hero slides, Stats, Home video, Photo gallery) generated from typed field definitions; 7 user stories (access, contact, hero, stats, video, gallery, saving/publishing), 35 FRs, 9 success criteria. Resolved the hero screenshot TODO to `screenshots/das.edu.pk_.png` and `screenshots/das.edu.pk_(Moto G Power).png`. Flagged the "Who We Are (third section)" vs PRD/reference "Why Choose" video naming conflict and treated it as the single home video. Defaults recorded as assumptions (display time 3–15 s, length limits, 20 images per upload, starting stats from reference, starting hero slide from reference image, no restore screen). Quality checklist passed on first iteration; no NEEDS CLARIFICATION markers.

## Outcome

- ✅ Impact: Spec ready for /sp.clarify or /sp.plan
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md, this PHR
- 🔁 Next prompts: /sp.clarify (optional, to confirm defaults) then /sp.plan
- 🧠 Reflection: brief conflicted with PRD on the video section name; flagged rather than silently resolved (Constitution I)

## Evaluation notes (flywheel)

- Failure modes observed: brief referenced placeholder screenshot filenames
- Graders run and results (PASS/FAIL): spec quality checklist PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

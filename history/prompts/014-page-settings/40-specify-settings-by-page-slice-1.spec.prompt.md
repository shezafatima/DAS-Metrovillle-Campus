---
id: 40
title: Specify settings by page slice 1
stage: spec
date: 2026-10-17
surface: agent
model: claude-opus-5-5
feature: 014-page-settings
branch: 014-page-settings
user: shezafatima
command: /sp.specify
labels: ["settings", "permissions", "admin-ux", "slice-1"]
links:
  spec: specs/014-page-settings/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/014-page-settings/spec.md
 - specs/014-page-settings/checklists/requirements.md
 - history/prompts/014-page-settings/40-specify-settings-by-page-slice-1.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

# Feature Brief — 014-page-settings (three slices)

Status: ready for /sp.specify, one slice at a time
Model: Opus for slice 1's plan (it reshapes Settings and permissions);
Sonnet is fine for slices 2 and 3.
Depends on: 005 Settings engine, 011 roles and permissions, and the
page features 006, 017, 018, 019, 020, 013.

## Goal

Reorganise the admin Settings area into one tab per public page, with
each tab showing that page's sections in the same order as the site.
Add three new admin-managed sections (Syllabi, Examination, Class
Levels), then make the remaining page text editable.

Too big for one feature, so it is built as three slices. Specify, plan
and build each slice separately, in this order.

---

## Slice 1 — Settings by page (structure only)

Move what already exists into page tabs. No new editable content.

### Tabs and routes
`/admin/settings/[tab]`, one route per tab, so each tab has its own URL
and permission check. `/admin/settings` redirects to the first tab the
user can see.

| Tab | Holds (existing groups moved here) |
|---|---|
| Site-wide | contact details, social links, timings, map |
| Home | hero slides, stats, Why Choose video URL, books, and any other home groups |
| About | (empty until slice 3; show "No settings yet" or hide the tab) |
| Academics | (slice 2 and 3) |
| Admission | admission window, announcement, closed message, classes open for admission |
| Resources | photo gallery albums |
| Careers | (slice 3) |

- Inside a tab, each section is a collapsible panel titled with the
  public section's name, in page order, with a "View on site" link to
  `/page#section-id`.
- Each panel saves on its own, as groups do today. Unsaved changes in
  one panel never block another (existing 005 behaviour).
- Report every current Settings group and its proposed tab before
  moving anything. Old admin Settings URLs redirect to the new tab.
- No data migration: groups keep their stored records; only the admin
  UI is rearranged.

### Permissions
- Site-wide tab: the existing Settings permission.
- Page tabs (Home, About, Academics, Admission, Resources, Careers):
  the existing Pages permission from 011.
- Exception: the admission window panel stays under the Settings
  permission even though it sits in the Admission tab, because it
  controls whether parents can register. A user without it sees the
  panel read-only.
- A tab the user can't access doesn't appear and its route returns 403.
  Server-side checks on every route and action, as for all admin
  features; add rows to the access matrix.

### Admin UX
- Tab bar across the top of Settings; scrolls horizontally on narrow
  screens, never wraps into two rows.
- Sticky "unsaved changes" indicator per panel; warn before leaving a
  tab with unsaved panels.

---

## Slice 2 — Syllabi, Examination, Class Levels (new, admin-managed)

All three are new public sections, managed from the start in the
Academics and Admission tabs. Each section is hidden on the public site
while it has no content.

### Syllabi — Academics tab → `/academics#syllabi`
Reference: https://das.edu.pk/academics/syllabi/ (11 levels: Play
Group, Nursery, PREP, Classes 1–8; subjects English, Mathematics,
Science from Class 4; topics as bullet points, some grouped under
sub-headings; no files).

Data shape:
`levels[] → { name, subjects[] → { name, groups[] → { heading?, topics: string[] } } }`

Admin editor:
- Add, rename, reorder and remove levels and subjects.
- Topics edited in a textarea, one topic per line; an optional group
  heading above each block.
- Plain text only, no HTML. Preview shows how it renders.

Public section:
- Level tabs (or a level picker on phones), subjects as headings,
  topics as bullet lists. Keyboard-accessible tabs (ARIA tabs pattern).
- Add "Syllabi" back to the Academics dropdown when it has content.

Initial content: offer a one-time seed script that copies the reference
syllabi verbatim into the database, marked pending client
confirmation. Run it only when I say so.

### Examination — Academics tab → `/academics#examination`
Reference: https://das.edu.pk/academics/examinations/ (four headed
prose blocks: Nursery and Prep, Grades 1–7, Classes 8–10, Unified
Examination; no tables or files).

Data shape: `blocks[] → { heading, body }` (body: plain paragraphs,
blank line between paragraphs).
- Admin: add, edit, reorder, remove blocks.
- Public: each block as a card or heading + text. Add "Examination"
  back to the Academics dropdown when it has content.
- Same optional seed script from the reference text.

### Class Levels — Admission tab → `/admission#class-levels`
Reference: https://das.edu.pk/admission/class-levels/ (a two-column
table "Class level" / "Age on 31 July"; the reference table is empty).

Data shape: `levels[] → { name, ageRule }` plus an editable "age
reference date" (default 31 July), e.g. "Playgroup — 2½ to 3½ years".
- Admin: add, edit, reorder, remove rows.
- Public: an accessible table (`<th scope>`), stacked rows on phones.
  Add "Class Levels" back to the Admission dropdown when it has rows.
- No seed (the reference has no data); the client supplies it.

### Link classes to registration
- The registration form's class dropdown currently comes from
  "Classes open for admission" (013). Change that setting to a
  checklist of the Class Levels rows, so admins tick which levels are
  open instead of typing names again.
- Keep storing the class name as text on each registration, so editing
  or deleting a level never changes past registrations.
- If a ticked level is deleted, it drops out of the checklist and the
  Settings screen warns.
- Update 013's tests accordingly.

---

## Slice 3 — Editable page text

Make the text and images that now live in content files editable from
the page tabs, page by page: About, Academics (overview, teachers'
training, hifz), Admission (procedure, uniform), Resources (mobile
apps), Careers intro, and the home page text not already in Settings
(section headings, supporting text, news heading, books text, salient
features, partners heading).

- Field shapes follow the existing typed content files exactly, so
  components switch from the file to the database without changes.
- The content file stays as the fallback/default when the database has
  no value yet.
- Images upload to Cloudinary, as hero slides do.
- Plain text with paragraphs; lists as one item per line. No rich-text
  editor and no HTML.
- Specify and build this slice one page at a time if it gets large.

---

## Rules for all slices

- Saves use compare-and-set (the ADR-0005 pattern), so two admins
  editing the same panel can't silently overwrite each other; the
  second save gets a clear "changed by someone else, reload" message.
- Every save is logged (who, which panel, when).
- Public pages show changes shortly after saving: revalidate the
  affected page on save; no stale content past that.
- Shared Zod schemas for client and server; length limits on every
  field.
- Text marked "pending client confirmation" keeps that marker in the
  admin UI until an admin edits and saves it.
- axe passes on the admin Settings tabs and on the affected public
  pages.

## Out of scope

- Adding, removing or reordering public page sections (layout stays
  fixed; content is edited inside it).
- Rich text / WYSIWYG.
- Content versioning beyond the audit log.

## Open questions for the client

1. Syllabi: do the reference syllabi apply to Metroville campus, and
   do they go above Class 8?
2. Examination: confirm the reference policy text applies.
3. Class Levels: the levels offered and the age rule for each.

## Response snapshot

Created branch `014-page-settings` (number fixed by the brief; remote fetch skipped because it hung) and wrote the slice 1 spec only. The spec opens with findings and the requested inventory of every current Settings group and its proposed tab: contact → Site-wide; hero, video, stats → Home; admission split into three panels (window dates under Settings, messages under Pages, classes TBD) → Admission; gallery albums → Resources; About/Academics/Careers hidden (no panels yet). Key findings: the `pages` permission is unused so far; there is no separate "books" setting (it is a stat); home Hero/Why Choose/Progress Dashboard lack fragment ids. 27 FRs, 5 user stories, 8 success criteria. Three clarifications left open: Q1 Settings-only users' access to the Admission tab, Q2 permission for the classes panel, Q3 what happens to existing accounts that hold Settings but not Pages.

## Outcome

- ✅ Impact: slice 1 spec ready for clarification, then /sp.plan
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md, this PHR
- 🔁 Next prompts: answer Q1–Q3; then /sp.plan (Opus)
- 🧠 Reflection: the admission group being one record split across two permissions is the main design risk (partial saves, sibling-panel conflicts)

## Evaluation notes (flywheel)

- Failure modes observed: `git fetch --all` hung past the timeout; local branches and specs were used for numbering.
- Graders run and results (PASS/FAIL): spec quality checklist — all PASS except open clarifications
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

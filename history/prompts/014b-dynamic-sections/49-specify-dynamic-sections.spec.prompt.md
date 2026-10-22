---
id: 49
title: Specify dynamic sections 014b
stage: spec
date: 2026-10-19
surface: agent
model: claude-opus-5-5
feature: 014b-dynamic-sections
branch: 014b-dynamic-sections
user: shezafatima
command: /sp.specify
labels: ["settings","syllabi","examination","class-levels","portal-links","registration","seed-scripts"]
links:
  spec: specs/014b-dynamic-sections/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/014b-dynamic-sections/spec.md
 - specs/014b-dynamic-sections/checklists/requirements.md
 - history/prompts/014b-dynamic-sections/49-specify-dynamic-sections.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

/sp.specify # Feature Brief — 014b-dynamic-sections

Status: ready for /sp.specify
Model: Sonnet is fine; Opus optional for the plan
Depends on: 014 slice 1 (Settings by page: tabs, panels, permissions,
compare-and-set saves, audit log, revalidation) — must be merged first.
Replaces: "Slice 2" in docs/briefs/014-page-settings.md, plus footer
portal links (new).

## Goal

Four parts of the public site become admin-managed:

| Section | Public location | Admin location | Permission |
|---|---|---|---|
| Syllabi | `/academics#syllabi` | Settings → Academics | Pages |
| Examination | `/academics#examination` | Settings → Academics | Pages |
| Class Levels | `/admission#class-levels` | Settings → Admission | Pages |
| Portal links | footer "Portal Links" column | Settings → Site-wide | Settings |

Each is a new panel in the tab shown, using slice 1's panel pattern:
its own save, compare-and-set, unsaved-changes marker, audit log entry
on save, and revalidation of the affected public pages.

Rules for all four:
- Shared Zod schema for client and server; length limits on every
  field; plain text only, no HTML.
- Server-side permission check on every read-for-edit and save; add
  rows to the access matrix (no session, wrong permission, right
  permission).
- Public section (or footer column) hidden while it has no content; the
  matching dropdown item is shown only when the section has content.
- axe passes on the admin panels and the public pages.
- Check public layout at 375, 768, 1024 and 1440 px.

---

## 1. Syllabi — Academics tab → `/academics#syllabi`

Reference: https://das.edu.pk/academics/syllabi/ — 11 levels (Play
Group, Nursery, PREP, Classes 1–8); subjects English, Mathematics, and
Science from Class 4; topics as bullet points, some grouped under
sub-headings; no files.

Data shape:
```
levels[] → { id, name,
  subjects[] → { id, name,
    groups[] → { id, heading?, topics: string[] } } }
```

Admin panel:
- Add, rename, reorder (up/down buttons, keyboard-accessible) and
  remove levels and subjects. Removing asks for confirmation and says
  how many topics will be lost.
- Inside a subject: groups, each with an optional heading and a
  textarea of topics, one per line (blank lines ignored, lines trimmed).
- One level open at a time in the editor, so the panel stays usable
  with hundreds of topics.
- A preview link to `/academics#syllabi`.
- Limits: 20 levels, 10 subjects per level, 20 groups per subject,
  100 topics per group, 200 chars per topic.

Public section:
- Level tabs (ARIA tabs pattern, arrow keys move between tabs); on
  phones, a level select instead of a long tab row.
- Within a level: subject headings, group sub-headings, bullet lists.
- Deep link: `/academics#syllabi` opens the first level.

Initial content: a one-time seed script that copies the reference
syllabi verbatim into the database, marked pending client
confirmation. Dry-run by default; writes only with `--confirm`; refuses
to overwrite existing syllabi. I'll decide when to run it.

## 2. Examination — Academics tab → `/academics#examination`

Reference: https://das.edu.pk/academics/examinations/ — four headed
prose blocks: Nursery and Prep; Grades 1–7; Classes 8–10; Unified
Examination. No tables or files.

Data shape: `blocks[] → { id, heading, body }`; body is plain
paragraphs separated by a blank line.

- Admin: add, edit, reorder, remove blocks. Limits: 20 blocks, heading
  120 chars, body 3000 chars.
- Public: each block as a card (heading + paragraphs) in a responsive
  grid, 1 column on phones, 2 from tablet.
- Seed script as for Syllabi (same rules), copying the reference text
  verbatim.

## 3. Class Levels — Admission tab → `/admission#class-levels`

Reference: https://das.edu.pk/admission/class-levels/ — a two-column
table ("Class level" / "Age on 31 July"); the reference table is empty,
so no seed. The client supplies the data.

Data shape:
```
{ ageReferenceDate: "07-31",   // day-month, default 31 July
  levels[] → { id, name, ageRule } }
// e.g. { name: "Playgroup", ageRule: "2½ to 3½ years" }
```

- Admin: edit the reference date; add, edit, reorder, remove rows.
  Limits: 30 rows, name 60 chars, age rule 80 chars.
- Public: accessible table with `<th scope="col">` headers; the age
  column header shows the reference date ("Age on 31 July"). Stacked
  label/value rows on phones.

### Link to registration (changes 013)
- "Classes open for admission" (Admission tab, Settings permission)
  changes from typed names to a checklist of the Class Levels rows.
  Admins tick which levels are open.
- The registration form's class dropdown shows the ticked levels, in
  Class Levels order.
- Each registration keeps storing the class name as text, so renaming
  or deleting a level never changes past registrations.
- If a ticked level is deleted, it drops out of the checklist and the
  Admission tab shows a warning. If no level is ticked, the form shows
  the Closed message (existing 013 rule).
- Migration: existing typed class names are matched to Class Levels
  rows by name (case-insensitive). Unmatched names are reported in a
  dry run and listed in the Admission tab as "not linked" until an
  admin resolves them. Nothing is silently dropped.
- Update 013's unit and E2E tests.

## 4. Portal links — Site-wide tab → footer

Today the footer's "Portal Links" column holds six fixed links (DAS
Portal, ePortal, Student Login, Mail Login, LMS App, Alumni
Registration) pointing to `/portal/[slug]` "available soon" placeholder
pages.

Data shape: `links[] → { id, label, url }`

Admin panel:
- Add, edit, reorder, remove links. Limits: 12 links, label 40 chars.
- URL validation:
  - must be an absolute `https://` or `http://` URL; reject
    `javascript:`, `data:`, relative and malformed URLs;
  - an `http://` URL is allowed but shows a warning in the panel:
    "Visitors' browsers will mark this site as not secure."
- Optional "Test link" button that opens the URL in a new tab.

Public footer:
- The column lists the links in order. Each opens in a new tab with
  `rel="noopener noreferrer"` and an accessible name that says it opens
  an external site.
- No links → the column is hidden and the other columns reflow.

Placeholder pages:
- Retire `/portal/[slug]`. Each old URL redirects permanently to `/`.
- Report every other link to `/portal/...` (for example the Resources
  Mobile Apps section) and repoint it; don't leave links to retired
  pages.

Initial content: a seed script, same rules as Syllabi (dry run first,
`--confirm` to write, never overwrites), with the six labels and the
reference site's URLs, marked pending client confirmation. Student
Login's URL is plain `http://` to an IP address, so it will show the
warning. I'll decide when to run it.

---

## Out of scope

- Editable text for the rest of the pages (014 slice 3).
- Files or PDF uploads for syllabi.
- Rich text.

## Open questions for the client

1. Syllabi: do the reference syllabi apply to Metroville campus? Any
   classes above Class 8?
2. Examination: confirm the reference text applies.
3. Class Levels: the levels offered and the age rule for each.
4. Portal links: the correct URLs for this campus, and whether Student
   Login has an `https://` address.

## Acceptance

- Each of the four panels saves, conflicts, logs and revalidates as in
  slice 1, under the stated permission; access matrix rows pass.
- Public sections and the footer column are hidden when empty and
  appear in the menu only with content.
- Syllabi editor stays responsive with the full reference content
  seeded.
- Registration form's class list comes from ticked Class Levels;
  existing registrations unchanged; migration reports unmatched names.
- Footer portal links open external sites safely; unsafe URLs are
  rejected; `/portal/*` redirects to `/`.
- Seed scripts: dry run by default, `--confirm` to write, never
  overwrite.

## Response snapshot

Asked two questions first. The user chose to branch now from HEAD with 014 slice 1's uncommitted work carried along, and to name the branch `014b-dynamic-sections`, so the branch, spec dir and prompts dir were created by hand instead of by the numeric-only script. Read the current code: Syllabi and Examinations were removed in 018 (legacy redirects to /academics), Class Levels was skipped in 020 (/admission/class-levels → /admission), "classes open" is a typed list in the admission record under Settings, and the footer holds six fixed /portal/<slug> links. No other /portal link exists in app code (no Resources Mobile Apps link); only e2e/page-sections.spec.ts references /portal. Wrote spec.md with six prioritised stories (Portal Links P1, Class Levels + registration link P1, migration P1, Syllabi P2, Examination P2, seed scripts P3), FR-001–FR-052, edge cases, 8 measurable success criteria and assumptions. Notable assumptions: section placement, legacy redirects repointed to the new anchors, "not linked" names stay offered in the form until resolved, pending notice clears on the first admin save. No clarification markers. The quality checklist passes.

## Outcome

- ✅ Impact: Spec ready for /sp.clarify or /sp.plan on branch 014b-dynamic-sections.
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md, this PHR
- 🔁 Next prompts: /sp.clarify (the "not linked" names in the form; legacy redirect targets), then /sp.plan
- 🧠 Reflection: The brief's "Resources Mobile Apps" example has no /portal link in the current code, so this was recorded as a finding rather than invented.

## Evaluation notes (flywheel)

- Failure modes observed: create-new-feature.ps1 cannot produce alphanumeric feature numbers ("014b"), so it was replicated by hand.
- Graders run and results (PASS/FAIL): spec quality checklist PASS (pass 1)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

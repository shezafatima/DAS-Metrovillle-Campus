---
id: 24
title: Admission window spec revision
stage: spec
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 020-admission
branch: 020-admission
user: shezafatima
command: /sp.specify (revised brief)
labels: ["admission", "settings", "admission-window", "timezone", "spec"]
links:
  spec: specs/020-admission/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/020-admission/spec.md
 - specs/020-admission/checklists/requirements.md
tests:
 - none (spec stage)
---

## Prompt

Feature Brief — 020-admission

Status: ready for /sp.specify Depends on: navigation sections conversion; 006 home (coverflow card component); 017/018/019 patterns (content files, release gate, hidden-when-empty, local images) Followed by: 013-student-registration (builds /admission/register and switches the Apply button on) Feeds into: 014-page-content (Admission tab in Settings)

Goal

Finish the public Admission page at /admission as one page with two anchored sections: Admission Procedure and Uniform.

Page structure

One h1. Each section has an h2 and a stable id, in this order:

#    Section    Anchor id
1    Admission Procedure    #admission-procedure (existing id, keep it)
2    Uniform    #uniform
The Admission dropdown lists exactly these two anchors, in order.
Class Levels is skipped for now (not confirmed by the client). Remove it from the dropdown and the page. Its old URL redirects to /admission. It will be added in a later feature.
Update the existing redirects from old /admission/... URLs to the nearest new anchor. Report the mapping.
Report and repoint any link elsewhere that targets a removed section.
Section 1 — Admission Procedure
Content
If the section already holds real procedure text, keep it unchanged.
If it only holds placeholder text, take the text verbatim from the reference page https://das.edu.pk/admission/admission-procedure/ and record the source URL in the content file. If the page can't be reached, stop and ask me. Do not write procedure text yourself.
If the reference text contains numbered steps or a documents list, present them as such (ordered list or step cards), keeping the wording exact.
Admission window (admin-controlled)

Add an "Admission" group to Settings, using the existing typed field-group engine from 005. Fields:

Field    Type    Rules
Opens on    date    optional
Closes on    date    optional; must be on or after Opens on
Announcement    text, single line    optional, max 160 chars; e.g. "Admissions are now open for Playgroup, Nursery, Class 1 and Class 2"
Closed message    text, single line    optional, max 160 chars; e.g. "Admissions for the new session will open soon"
Dates are whole days in Pakistan time (Asia/Karachi). Open from the start of Opens on to the end of Closes on, inclusive.
If either date is empty, admissions are closed.
Who can edit: users with the Settings permission, like other Settings groups. Every save is logged (who, what, when), as for other settings.
Show the current state on the Settings screen, in words: "Open now until 31 March 2027", "Opens on 1 January 2027", or "Closed".
On the public page

In the Admission Procedure section, above the procedure text:

Open: a highlighted announcement banner with the admin's Announcement text (if set) and "Applications close on [date]".
Closed: the Closed message as a quiet note, if set; otherwise nothing.
The window must switch on and off by itself at midnight Pakistan time without anyone saving or redeploying. The page must therefore not serve a cached "open" or "closed" state past the change: render the banner per request or revalidate often enough (state how).
Apply button
Below the procedure, a prominent "Apply Now" button linking to /admission/register, in the site's primary button style.
Its visibility comes from one function, isAdmissionApplyOpen(), which returns true only when BOTH:
the admission window is open (above), and
the registration form exists: a constant in the admission content file, default off. 013 removes this constant when it builds /admission/register.
Until 013 is built, an open window shows the announcement banner but no Apply button. Do not build the form or the registration page now.
When the button is hidden, show nothing in its place.
013 will reuse the same window to refuse form submissions on the server outside the dates.
Section 2 — Uniform
Content

Source: https://das.edu.pk/admission/uniform/

The reference groups uniforms by category, then by gender, with five items each:

Category    Boys    Girls
Kids Uniform    5 items    5 items
Hifz Students' Uniform    5 items    5 items
Senior Students' Uniform    5 items    5 items
Copy every group heading and item verbatim from the reference page, including how items are combined on one line (e.g. "White scarf and green blazer"). Record the source URL. If it can't be reached, stop and ask me.
Don't invent extra items, notes, prices or ordering information.
Photos
Photos are in the uniform folder in the project. Find it, list its files, and match each photo to its group (e.g. Kids – Boys). Report the matching for my confirmation before using them. If a file name doesn't make the match obvious, ask me rather than guessing.
Copy the used photos to public/images/admission/uniform/ with clear names, optimised for the web. Do not hotlink from das.edu.pk.
Some groups may have no photo (the reference has none for Hifz). Report which ones.
Every photo needs alt text describing the uniform, e.g. "Kids boys' uniform: green check shirt, light green pants and green blazer".
UI — reuse the existing animated card component

Use the coverflow flip-card component from the home page section after the hero. Extend it; do not copy it into a second component.

Six cards, one per group: Kids – Boys, Kids – Girls, Hifz – Boys, Hifz – Girls, Senior – Boys, Senior – Girls (the order follows the reference).
Front: the uniform photo and the group name.
Back: the group name and its item list as a real <ul>.
Same behaviour as on the home page: hover flips on desktop, tap flips on touch, auto-advance pauses while any card is flipped, on hover and on focus, swipe on touch, arrow keys for keyboard, no auto-advance under prefers-reduced-motion.
The home cards' back holds a link; these backs hold a list and no link. The component must support a back with no link, and the card must still be a button that flips, not an anchor.
Group with no photo: show the group name on a plain card front using existing tokens and a neutral uniform icon (lucide-react), never an empty image box.
The home page cards must look and behave exactly as before. Run the home coverflow specs to prove it.
Content source and future editing
Typed content files under src/content/admission/, shaped as the Admission tab in Settings will edit them in 014: uniform: [{ id, category, gender, items: string[], image?: { src, alt } }].
Mark reference-copied text as pending client confirmation.
Design rules
Theme colours and fonts unchanged. New size and spacing values as tokens.
SectionHeading with existing variants; alternate section backgrounds; scroll-margin-top token on both sections.
Check at 375, 768, 1024 and 1440 px: no sideways scroll, card text readable on the back at every width.
Out of scope
The registration form and page (013), and server-side refusal of submissions outside the window (013).
Class Levels (later).
Admin editing of Admission content (014-page-content).
Open questions for the client
Confirm the uniform lists still apply to Metroville campus (the reference page was last updated in 2019).
Hifz uniform photos, if any.
Confirm the admission procedure text applies to this campus.
Class Levels content, when ready.
Acceptance
/admission shows Admission Procedure then Uniform, with working anchors from the dropdown and mobile menu; Class Levels is gone and redirects to /admission.
Text matches the reference verbatim.
Admins with the Settings permission can set the open and close dates, announcement and closed message; saves are logged.
The announcement appears only between the dates and switches by itself at midnight Pakistan time.
Apply Now appears only when the window is open AND the registration form exists, so it stays hidden until 013.
E2E/unit: window open/closed/before-start/after-end, empty dates, end-before-start rejected, Pakistan-time day boundaries.
Six uniform cards flip and auto-advance as specified; groups without photos render cleanly.
Home page coverflow unchanged; its specs pass.
axe accessibility scan on /admission passes.
E2E: anchors, redirects, card flip by hover, tap and keyboard, auto-advance pause while flipped, item lists readable, layout at four widths.

## Response snapshot

Rewrote specs/020-admission/spec.md for revision 2: added the Settings "Admission" group (US2, FR-008..FR-013), the public banner/quiet note with request-time open/closed decision across Asia/Karachi midnight (US3, FR-014..FR-016), and isAdmissionApplyOpen() = window open AND "form exists" constant (US6, FR-017..FR-020); SC-004..SC-007 added. Q2 resolved by the brief. Found that the 005 engine has no date field and no two-field rule (recorded as dependency), saves already log settings_saved with who/group/when, and public settings are cached 60 s, so open/closed is computed per request. Q1 (procedure source, given URL 404) and photo confirmation remain open.

## Outcome

- ✅ Impact: Spec updated to revision 2; 1 clarification still blocks /sp.plan
- 🧪 Tests: none (spec stage)
- 📁 Files: specs/020-admission/spec.md, specs/020-admission/checklists/requirements.md
- 🔁 Next prompts: answer Q1 and confirm photos, then /sp.plan
- 🧠 Reflection: the revised brief still points at the 404 procedure URL

## Evaluation notes (flywheel)

- Failure modes observed: brief assumes engine support (date field, cross-field rule) that does not exist
- Graders run and results (PASS/FAIL): spec quality checklist — all pass except Q1
- Prompt variant (if applicable): revision 2
- Next experiment (smallest change to try): null

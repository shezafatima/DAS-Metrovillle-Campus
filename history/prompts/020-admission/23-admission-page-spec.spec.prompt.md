---
id: 23
title: Admission page spec
stage: spec
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 020-admission
branch: 020-admission
user: shezafatima
command: /sp.specify
labels: ["admission", "uniform", "coverflow", "redirects", "spec"]
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
Apply button
Below the procedure, a prominent "Apply Now" button linking to /admission/register, in the site's primary button style.
/admission/register does not exist yet (feature 013). Keep the button behind the existing single flag so it stays hidden until 013 switches it on. Do not build the form or the page now.
When the flag is off, show nothing in its place (no "coming soon").
013 will also add the admission window (open/closed dates). Leave a clear hook for it: the button's visibility should come from one function 013 can extend, not from scattered conditions.
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
The registration form and page (013).
The admission open/close window (013).
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
Apply Now is hidden until 013 switches the flag on.
Six uniform cards flip and auto-advance as specified; groups without photos render cleanly.
Home page coverflow unchanged; its specs pass.
axe accessibility scan on /admission passes.
E2E: anchors, redirects, card flip by hover, tap and keyboard, auto-advance pause while flipped, item lists readable, layout at four widths.

## Response snapshot

Created branch 020-admission and specs/020-admission/spec.md (4 user stories, FR-001..FR-024, SC-001..SC-008, verbatim uniform reference table, redirect mapping) plus the quality checklist. Findings: current Admission Procedure is placeholder only; the given procedure URL returns HTTP 404 while the procedure text exists at https://das.edu.pk/admission/; the uniform page was extracted verbatim from raw HTML; no registration flag exists in the codebase; the four photos in public/images/uniform/ match the reference's Kids/Senior placements, with no photo for either Hifz group. Stopped with two clarifications (Q1 procedure source, Q2 flag form) and asked to confirm the photo matching.

## Outcome

- ✅ Impact: Spec drafted; blocked on 2 clarifications before /sp.plan
- 🧪 Tests: none (spec stage)
- 📁 Files: specs/020-admission/spec.md, specs/020-admission/checklists/requirements.md
- 🔁 Next prompts: answer Q1/Q2 and confirm photos, then /sp.clarify or /sp.plan
- 🧠 Reflection: WebFetch paraphrased the reference; raw HTML extraction was needed for verbatim text

## Evaluation notes (flywheel)

- Failure modes observed: reference URL in brief is 404; brief assumed an existing flag that does not exist
- Graders run and results (PASS/FAIL): spec quality checklist — all pass except open clarifications
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

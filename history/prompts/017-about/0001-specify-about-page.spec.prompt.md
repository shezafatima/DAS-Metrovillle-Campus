---
id: 0001
title: Specify About page
stage: spec
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: 017-about
branch: 017-about
user: shezafatima
command: /sp.specify
labels: ["about", "content", "navigation", "redirects", "spec"]
links:
  spec: specs/017-about/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/017-about/spec.md
 - specs/017-about/checklists/requirements.md
 - history/prompts/017-about/0001-specify-about-page.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

Feature Brief — 017-about

Status: ready for /sp.specify Depends on: navigation sections conversion (public-layout-redesign), 005-settings (media upload pattern) Feeds into: 014-page-content (About tab in Settings)

Goal

Build the public About page at /about as one page with five anchored sections, using the client's own text from the supplied Word documents.

Source content

The client's text is in Word files in docs/content-source/about/:

File    Section
our-story.docx    Our Story
vision-mission.docx    Vision & Mission
core-values.docx    Core Values
messages.docx    Messages

Rules for using it:

Extract the text from each file. Use the wording exactly as written. Do not rewrite, shorten, summarise or "improve" it.
If there are obvious typos or grammar mistakes, do not fix them silently. List them in the report so the client can approve fixes.
Keep the document's paragraph breaks, headings and lists.
If a file contains Urdu, set lang="ur" and dir="rtl" on that text.
Report anything in a file that does not fit its section (for example extra headings, images, tables, or text that belongs elsewhere).
Page structure

One h1 for the page. Each section has an h2 and a stable id. Sections appear in this order:

#    Section    Anchor id
1    Our Story    #our-story
2    Vision & Mission    #vision-mission
3    Core Values    #core-values
4    Our Management Team    #management-team
5    Messages    #messages

The About dropdown in the header lists these five anchors, in this order. Careers is no longer in the About dropdown (it is a main nav item).

The navigation conversion already created About sections from the old sub-routes. Replace them with the five sections above, and update the permanent redirects from the old /about/... URLs so each points to the closest new anchor (or to /about if none fits). Report the mapping.

Sections
1. Our Story
Heading and the text from our-story.docx.
Layout: readable text column with a comfortable line length. A supporting image beside it on desktop is optional; use an existing placeholder and leave the image replaceable.
2. Vision & Mission
Text from vision-mission.docx, split into Vision and Mission.
This is the visual highlight of the page. Use the frontend-design skill to give it a distinctive treatment within the existing theme: for example two side-by-side panels with icons, using the navy and yellow tokens. No new colours or fonts.
Stacks to one column on phones.
3. Core Values
Values from core-values.docx.
Each value as a card or tile: icon, value name, and its description if the file has one.
Grid: 1 column on phones, 2 on tablets, 3 or 4 on desktop depending on the number of values. Report how many values there are.
Icons from lucide-react, chosen to fit each value. Decorative (aria-hidden).
4. Our Management Team
Content is not available yet. The client will supply it later.
Each member card: photo, name, designation (role), and a short description.
Build the section and the card layout now, with a typed data shape for members.
Do NOT invent names, roles or descriptions, and do not use photos of real people. In development, show clearly marked placeholder entries (neutral silhouette image, "Name", "Designation", "Short description").
In production, if there are no members, hide the section and remove it from the About dropdown, so the live site never shows placeholders.
Photo: fixed aspect ratio, rounded, cropped consistently. Photos will later come from Cloudinary (public media), as other site images do.
5. Messages
Messages from messages.docx. Report how many there are (for example Chairman, Principal).
Each message: photo, name, designation, and the message text.
Photos may not be in the file. Use the same placeholder as the team section and leave them replaceable.
Long messages: show the first part with a "Read more" toggle that expands in place (a button with aria-expanded, not a link to another page). Full text stays in the HTML so it is readable without JavaScript and by search engines.
Alternate the photo side between messages on desktop if there is more than one.
Content source and future editing
Store the extracted content in typed content files under src/content/about/, with one typed shape per section.
Shape these exactly as the About tab in Settings will edit them in 014-page-content, so 014 can switch the source from the content file to the database without changing the components.
Mark all text as "pending client approval" where it was edited or is placeholder.
Design rules
Theme colours and fonts unchanged. No new colours or fonts.
Section headings follow the patterns already used on the home page (SectionHeading component, with the existing variants).
Alternate section backgrounds so sections are visually distinct, using existing tokens.
Each section has the scroll-margin-top token so its heading is not hidden under the fixed header when reached by anchor.
Check at 375, 768, 1024 and 1440 px: no sideways scroll, clean stacking, readable line lengths.
Out of scope
Admin editing of About content (comes in 014-page-content).
Management team real data (supplied later by the client).
Academics and Admission pages (separate features).
Open questions for the client
Management team: who is listed, their designations, photos and short descriptions.
Messages: photos of the people giving the messages.
Approval of any typo or grammar fixes found in the documents.
A photo for the Our Story section, if they want one.
Acceptance
/about shows the five sections in order, with working anchors from the header dropdown and mobile menu.
Old /about/... URLs redirect to the right anchors.
Text matches the Word documents exactly, apart from fixes the client has approved.
No placeholder team members appear in production.
Read more works by keyboard and screen reader.
E2E: anchors, redirects, read-more toggle, team section hidden when empty, layout at four widths.

Clarification answers (2026-10-09): Urdu → "English only for now"; Welcome Note → "Leave it out"; Read more threshold → "don't apply".

## Response snapshot

Created branch 017-about and specs/017-about/spec.md. docs/content-source/about/ does not exist; the client text is in das-text/ (Page 4 = Our Story, page 2 = Vision & Mission, Page 3 = Core Values, Page 1 = Messages), which was mapped and reported. Findings: 6 core values (3-column desktop grid), 3 messages (Khairullah Aziz, Ijaz Afzal, Faiza Zeeshan), an unattributed Welcome Note, a brochure tagline at the end of each file, a "(Page No 1)" marker, an Arabic (not Urdu) Qur'anic line, and English/Urdu versions that differ; no images, tables or Word lists. Typos and inconsistencies T1–T6 are listed for client approval. Redirect mapping: overview→#our-story, salient-features→/about, management→#management-team, messages→#messages; the home card link /about#salient-features changes to /about. The owner chose: English only (Urdu stored, not shown), Welcome Note left out, no Read more toggle (removes the brief's Read more requirement and its E2E). The checklist passes all items.

## Outcome

- ✅ Impact: Spec ready for /sp.plan, with the content mapping, findings, typo list and redirect mapping recorded.
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md, this PHR
- 🔁 Next prompts: /sp.plan (confirm the das-text mapping; define the content shapes for 014)
- 🧠 Reflection: The brief's source path was wrong; reading the actual files surfaced the bilingual content and the Welcome Note before planning.

## Evaluation notes (flywheel)

- Failure modes observed: brief referenced non-existent source paths; brief requirement (Read more) removed by owner answer.
- Graders run and results (PASS/FAIL): spec quality checklist PASS (iteration 2)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

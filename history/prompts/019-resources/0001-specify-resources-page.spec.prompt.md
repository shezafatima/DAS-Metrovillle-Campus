---
id: 0001
title: Specify Resources page
stage: spec
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 019-resources
branch: 019-resources
user: shezafatima
command: /sp.specify
labels: ["resources", "spec", "mobile-apps", "gallery", "link-check"]
links:
  spec: specs/019-resources/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/019-resources/spec.md
 - specs/019-resources/checklists/requirements.md
 - history/prompts/019-resources/0001-specify-resources-page.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

/sp.specify # Feature Brief — 019-resources

Status: ready for /sp.specify (client confirmation needed on links, see
Open questions)
Depends on: navigation sections conversion, 007-gallery-albums,
017/018 patterns (content files, release gate, hidden-when-empty)
Feeds into: 014-page-content (Resources tab in Settings)

## Goal

Finish the public Resources page at `/resources` as one page with two
anchored sections: Photo Gallery and Mobile Apps.

## Page structure

One `h1`. Each section has an `h2` and a stable id, in this order:

| # | Section | Anchor id |
|---|---|---|
| 1 | Photo Gallery | `#photo-gallery` (existing, keep the id) |
| 2 | Mobile Apps | `#mobile-apps` (placeholder exists, replace it) |

- The Resources dropdown lists exactly these two anchors, in order.
- Remove the Downloads and Our Books sections from the page. Before
  removing, report everything that still links to `#downloads` or
  `#our-books` (the home icon quick-links did) and repoint each to the
  closest working target. Propose the targets; don't guess silently.
- Keep Settings → Books and its data: the home page books strip still
  uses it. Only the Resources section goes.
- If the page has any other section today (for example a careers
  call-to-action), report it and keep it unless I say otherwise.

## Section 1 — Photo Gallery (structure only)

The gallery from 007 works and its behaviour must not change: albums,
caps, viewer, lazy loading, data source, admin screens.

Bring it into the same section structure as the About and Academics
pages:
- SectionHeading with the existing variants for the `h2`.
- The shared section wrapper, spacing tokens and the scroll-margin-top
  token, so `/resources#photo-gallery` lands with the heading visible
  under the fixed header.
- Section background alternates with Mobile Apps, using existing tokens.
- No change to album cards, the grid or the viewer, apart from what the
  wrapper needs.

The existing 007 E2E specs must still pass unchanged, apart from
assertions on the old heading markup, which you should report and
update.

## Section 2 — Mobile Apps (reference content, new UI)

### Content
Source: https://das.edu.pk/resources/scarlet-mobile-apps/

- Copy the heading ("Scarlet Series Mobile Applications") and the body
  text verbatim from the reference page. Record the source URL in the
  content file. Do not rewrite or shorten it. If the page can't be
  reached, stop and ask me.
- The reference lists three apps, each with a download link: English,
  Math and Urdu. Use the same three, with their reference links.
- The reference "Scarlet Series for Playgroup" photo: download it once
  and store it locally in `public/images/resources/`. Do not hotlink
  images from das.edu.pk. Do not reuse the reference's download-button
  images; the new UI draws its own buttons.
- Also include the LMS App, using its Google Play link from the
  reference site's portal links (package `com.darearqam.daslms`), as a
  fourth app card. Report the exact URL you used.

### Check the download links before building
The reference app links point to Google Drive files, not app stores.
For each one, report:
- whether the link still works (it was last updated in 2022);
- what kind of file it is (an Android APK file installs outside the
  Play Store and Android shows a security warning);
- whether a Play Store or App Store listing exists for the same app.

If a link is dead, keep the card with no download button and mark it
for the client. Do not invent store links.

### UI (new, not the reference layout)
Use the frontend-design skill, within the existing theme (navy, yellow,
white; no new colours or fonts; new sizes as tokens).

- Intro: heading and the reference text on one side, the playgroup
  photo on the other. Stacks on phones, text first.
- Apps: one card per app, in a grid (1 column on phones, 2 on tablets,
  4 on desktop for four apps).
- Each card: an icon (lucide-react, chosen to fit the subject:
  English, Math, Urdu, LMS), app name, a one-line label from the
  reference text if it has one (otherwise just the name; don't invent
  descriptions), and a clear download button.
- Button wording matches the link type:
  - Google Play link: "Get it on Google Play" style (text button in the
    site's style; don't use Google's badge artwork unless I supply it).
  - Google Drive / APK link: "Download for Android" plus a short note
    that it installs from outside the Play Store.
- All download links open in a new tab with `rel="noopener noreferrer"`
  and have an accessible name that includes the app name (e.g.
  "Download Scarlet English app").
- Subtle hover: card lift and button colour change, transform and
  colour only.

## Portal links (found on the same reference page)

The reference header lists real URLs for the portal links (DAS Portal,
ePortal, Student Login, Mail Login, LMS App, Alumni Registration). Our
site currently sends them to "available soon" placeholder pages.

Do NOT switch the portal links over in this feature. List the six URLs
in `docs/content-source/resources/client-review.md` for client
confirmation, because they belong to the head office network and the
campus may use different ones. Note that Student Login points to a bare
IP address over plain HTTP, so browsers will mark it "Not secure".

## Content source and future editing

- Typed content file `src/content/resources/mobile-apps.ts`, shaped as
  the Resources tab in Settings will edit it in 014:
  `{ heading, body, image, apps: [{ id, name, label?, icon, url,
  linkType: "play-store" | "app-store" | "direct-download" }] }`.
- Mark reference-copied text and links as pending client confirmation.

## Design rules

- Theme colours and fonts unchanged. New size and spacing values as
  tokens.
- scroll-margin-top token on both sections.
- Check at 375, 768, 1024 and 1440 px: no sideways scroll, clean
  stacking, card heights equal within a row.

## Out of scope

- Any change to gallery behaviour or admin.
- Switching portal links to real URLs.
- Downloads and Our Books content.
- Admin editing of Resources content (014-page-content).

## Open questions for the client

1. Are the three Scarlet apps still offered, and are the Google Drive
   download links current? Are they on the Play Store?
2. Confirm the LMS App Play Store link is the right one for this campus.
3. Confirm the six portal URLs from the reference site apply to
   Metroville campus. Student Login uses an insecure HTTP address.
4. Approval of any typo fixes in the reference text.

## Acceptance

- `/resources` shows Photo Gallery then Mobile Apps, with working
  anchors from the dropdown and mobile menu.
- Downloads and Our Books are gone; nothing on the site links to them.
- Gallery behaviour unchanged; 007 specs pass.
- Mobile Apps text matches the reference verbatim; images are local.
- Every download link works or its card is clearly marked; no
  invented links.
- axe accessibility scan on `/resources` passes.
- E2E: anchors, no links to removed sections, app links have
  accessible names and safe `rel`, layout at four widths.

## Response snapshot

Created branch `019-resources` and `specs/019-resources/spec.md` (4 user stories, FR-001–FR-028, SC-001–SC-010) and its quality checklist. Pre-build checks (2026-10-12):
- Downloads and Our Books sections were never built (only code comments). Nothing links to `#downloads`/`#our-books`; home quick-access cards point elsewhere, so no repointing is needed. No other sections on /resources.
- Reference page reached; heading, body and photo captured verbatim. No per-app labels on the reference.
- Download links: Scarlet English Drive APK works; Scarlet Math and Urdu Drive files return 404; LMS Play listing (`com.darearqam.daslms`) returns 404. No store listings found for any.
- Portal URLs: DAS Portal and ePortal (plain HTTP) don't resolve; Student Login (bare IP, HTTP) timed out; Mail Login is Google sign-in; Alumni form works.
- Findings R1–R5 for client. No 007 E2E assertions on the gallery h2 markup; two page-sections E2E tests on the Mobile Apps placeholder need updating.
One clarification left (FR-016): what visitors see on a card with no working link.

## Outcome

- ✅ Impact: Spec ready pending one clarification; link check shows 3 of 4 app links dead.
- 🧪 Tests: none (specification stage)
- 📁 Files: spec.md, checklists/requirements.md, this PHR
- 🔁 Next prompts: answer Q1 (FR-016), then /sp.clarify or /sp.plan
- 🧠 Reflection: The brief assumed Downloads/Our Books existed and the links worked; checking first changed the scope materially.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): spec quality checklist — all pass except the one open clarification
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

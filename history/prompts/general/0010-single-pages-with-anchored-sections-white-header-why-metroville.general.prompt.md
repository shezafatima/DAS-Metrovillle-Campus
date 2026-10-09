---
id: 0010
title: Single pages with anchored sections, white header, Why Metroville text
stage: general
date: 2026-10-09
surface: agent
model: claude-sonnet-5-5
feature: none
branch: public-layout-redesign
user: shezafatima
command: navigation change (report first, then implement), white header, home text swap, test fixes, branch and build checks
labels: ["navigation", "anchors", "redirects", "header", "home", "e2e", "adr", "build"]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: history/adr/0009-single-pages-with-anchored-sections.md
  pr: null
files:
 - src/content/site-shell.ts (pageSections, anchors, new menu), next.config.ts (permanent redirects)
 - src/components/site-shell/anchored-sections.tsx; pages about, academics, admission, resources
 - removed: about/academics/admission/resources [slug] pages, campuses, hifz-e-quran
 - src/app/globals.css (anchor scroll-margin token, smooth scroll), src/app/layout.tsx
 - src/components/site-shell/header-frame.tsx, nav-desktop.tsx, nav-mobile.tsx, search-box.tsx (white header)
 - src/content/home.ts, src/components/home/inspiration-why-choose.tsx (Why Metroville Campus text)
 - e2e: page-sections (new), desktop-navigation, mobile-navigation, shell-careers-links, site-search, shell-and-placeholders, header-scroll, admin-settings-layout, admin-gallery-albums, admin-gallery-public
 - history/adr/0009-single-pages-with-anchored-sections.md
tests:
 - vitest (site-shell, content, site-search, home): all pass
 - playwright chromium (workers 1): page-sections 12/12, header-scroll, desktop/mobile navigation, site-search, shell-careers-links, footer, home-inspiration, shell-and-placeholders pass
 - npm run build into a clean .next: compiled, type-check clean
---

## Prompt

Test follow-ups first: commit the albums and gallery-public spec fixes as a test-fix commit; replace the fixed 700 ms wait in `admin-settings-layout.spec.ts` with a wait on the panel's animations finishing; scope the ambiguous mobile site-search "Contact" locator to the results list (commit separately); rerun the partners frame cost later on an idle machine.

Then the navigation brief (verbatim, abridged only by the report list at its end):

> Navigation change only: replace sub-route pages with single pages made of anchored sections. Public site only. Do not change page content, design, or anything outside navigation and routing in this step. 1. Applies to EVERY main nav item that has a dropdown or sub-routes (About, Academics, Admission, Resources, and any others you find), not just About. Each becomes ONE page. Its sub-routes become sections of that page: /academics/xyz becomes /academics#xyz. Dropdown links point to the anchors. Section ids are short, lowercase, hyphenated and stable. Each page has one h1, and each section an h2. Sections keep exactly the content their sub-route pages have today. 2. Main nav changes: remove Campuses from the main nav; Careers takes its place as a main nav item linking to /careers; remove Careers from the About dropdown (keep it in the footer). Resources dropdown shows only Photo Gallery (#photo-gallery) and Mobile Apps (#mobile-apps); Mobile Apps is a new section with a placeholder only. Drop Downloads and Our Books from the dropdown but do not delete those sections. 3. Pages that stay real routes: /careers, /admission/register, /news and /news/[slug], /contact, /portal/[slug]. 4. Redirects: every old sub-route redirects permanently to its new anchor; /campuses redirects to /contact; use next.config redirects, not proxy.ts; update links elsewhere. 5. Anchor behaviour: scroll-margin-top equal to the fixed header height as a token; smooth scroll, off under prefers-reduced-motion; tapping an anchor in the mobile menu closes the menu; same-page clicks scroll without a reload; dropdowns and the mobile menu stay keyboard-accessible. 6. Docs: flag only (PRD §4, §5.3, Open Question 2, feature 015-campuses); draft an ADR. Before implementing, report back; do not implement until I've seen the report.

Answers: redirect only the known sub-routes, unknown slugs 404; Prospectus, Monthly Arqam, Newsletters, Useful Links and Our Books redirect to /resources; Campuses card goes to /contact (label mismatch listed as a follow-up); Mobile Apps gets a heading, a "coming soon" line and the LMS App link; tell me what the Scarlet Mobile Apps stub is. "Go ahead and implement."

During the work: "okay instead of a transparent nav make it white"; then "reverse the nav changes why you decrease the banner height i said you to convert the transparent nav bg which is before sctroll to same white that is after scroll i don't want a transaperent bg the white one is perfect throughout the website"; then "now replace this heading and its para "WHY CHOOSE DAR-E-ARQAM SCHOOLS" with this" followed by the "Why Metroville Campus?" text.

Then: fix the exit-127 dev-server restart, fix the two stale assertions in shell-and-placeholders.spec.ts, commit the nav work in six ordered commits; check the Vercel failure (`.next/lock`) for committed artefacts; create `public-layout-redesign` from local HEAD and push it without touching 012-careers; stop the port-3000 server, delete `.next`, run `npm run build`, restart the server; then add the white-header and Why Metroville commits plus this PHR.

## Response snapshot

Reported first (every nav item with its new section id, the routes that stay real, every link to an old sub-route, the E2E specs involved). Implemented one `pageSections` source feeding the menu, the pages and the redirects. The sub-route pages were all placeholders, so the sections are placeholders too. The header is white at every scroll position and still overlays the unchanged full-height hero. Found that the 127 exit was Windows reporting a force-killed dev server, not a bad command, and that no build artefacts or personal data were ever tracked.

## Outcome

- ✅ Impact: About, Academics, Admission and Resources are single pages with anchored sections; old routes redirect permanently; Careers is a main item; the Resources menu is Photo Gallery and Mobile Apps; the header is white everywhere; the home "Why" block has the new text (pending client approval).
- 🧪 Tests: see front matter. Two failures in `shell-and-placeholders.spec.ts` were stale before this work and are fixed.
- 📁 Files: see front matter.
- 🔁 Next prompts: (a) PRD §4, §5.3 and Open Question 2 updates, feature 015-campuses dropped (owner); (b) the "Branch Network" card label no longer matches its /contact target; (c) partners frame cost on an idle machine; (d) client approval for the Why Metroville text and other pending texts; (e) origin/012-careers still holds the snapshot commit ed32395.
- 🧠 Reflection: a force-killed Windows dev server reports exit 127. Shorter pages cannot scroll their last section to the very top, so anchor tests assert "clear of the header", not "exactly at it". A snapshot commit made mid-task by someone else had to be undone with a mixed reset to produce the ordered commits.

## Evaluation notes (flywheel)

- The first reading of "Careers takes its place" was ambiguous; it was placed in Campuses' slot (third), which is a one-line change if the owner wants it elsewhere.
- Long multi-part prompts are summarised in order here, with the main brief quoted.

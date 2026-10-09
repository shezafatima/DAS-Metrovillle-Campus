# ADR-0009: Public Navigation — Single Pages With Anchored Sections Instead of Sub-Routes, With Permanent Redirects

- **Status:** Proposed (draft for the owner's approval)
- **Date:** 2026-10-09
- **Feature:** 001-site-shell (navigation), touching 006-home-page, 007-gallery-albums
- **Supersedes:** the sub-route structure created by feature 001 (`/about/<slug>`, `/academics/<slug>`, `/admission/<slug>`, `/resources/<slug>`, `/hifz-e-quran`, `/campuses` placeholders)
- **Context:** Feature 001 created a placeholder page for every dropdown entry, mirroring the reference site's addresses. None of them holds content, so each is a near-empty page, and the menu fans out into about twenty routes for four pages' worth of material. The owner asked for each main item to be one page whose former sub-routes are sections. Resources already works this way for the gallery (`/resources#photo-gallery`, feature 007). Campuses is dropped (PRD Open Question 2 is resolved: Metroville only), and Careers becomes a main item.

## Decision

- **One page per main item** (About, Academics, Admission, Resources). Each former sub-route becomes a `<section id>` with an `h2`, under a single `h1`. Ids are short, lowercase and hyphenated, and are defined once in `pageSections` (`src/content/site-shell.ts`), which feeds the menu, the pages and the redirects.
- **Dropdown links are anchors** (`/about#overview`). The menu keeps its keyboard behaviour; the mobile menu closes on selection; same-page clicks scroll without a reload (`next/link`).
- **Permanent redirects in `next.config.ts`** (not `proxy.ts`): each known old sub-route goes to its anchor, `/hifz-e-quran` to `/academics#hifz-e-quran`, `/campuses` to `/contact`, and the retired Resources entries to `/resources`. Only known routes redirect; any other slug is a 404.
- **Routes that stay real pages:** `/careers`, `/contact`, `/news` and `/news/[slug]` (its categories are database lists), `/resources/gallery/[albumId]`, `/portal/[slug]`, and `/admission/register` when it is built.
- **Anchor behaviour:** `.anchor-section` uses `scroll-margin-top: var(--anchor-scroll-margin)`, a token equal to the fixed header height; smooth scrolling is on only under `prefers-reduced-motion: no-preference`.

## Consequences

### Positive

- Fewer routes and no empty pages; one URL per topic; sections can be linked and shared.
- One source for ids, so a menu entry, a section and its redirect cannot drift apart.

### Negative

- Long pages: a section's content now loads with its page. Acceptable while the sections are placeholders; revisit if a page grows heavy.
- Fragments are not sent to the server, so analytics and server logs see only the page. Old URLs keep working through the redirects.
- Section-level metadata (titles, descriptions) is now per page, not per section.

## Alternatives considered

- Keep sub-routes and fill each page: more routes to maintain and more near-empty pages until content exists.
- Redirects in `proxy.ts`: runs on every request; `next.config.ts` redirects are static and cheaper.

## Follow-ups

- PRD §4 (sitemap) and §5.3 (Campuses) need updating by the owner; Open Question 2 is resolved; feature 015-campuses is dropped. The home quick-access card "Branch Network" now points to `/contact` and its label no longer matches its target.

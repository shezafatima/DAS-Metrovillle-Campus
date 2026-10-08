---
id: 0009
title: Public site layout overhaul, home sections and footer
stage: general
date: 2026-10-08
surface: agent
model: claude-sonnet-5-5
feature: none
branch: 012-careers
user: shezafatima
command: a series of layout change requests (report first, then implement), see Prompt
labels: ["home", "cards", "news", "books", "salient-features", "partners", "dashboard", "footer", "e2e", "performance"]
links:
  spec: specs/006-home-page/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/components/home/quick-access-cards.tsx (coverflow), heading-stroke.tsx, section-heading.tsx
 - src/components/home/inspiration-why-choose.tsx (navy band, no logo)
 - src/components/home/latest-news.tsx, home-news-card.tsx; src/components/news/cover-image.tsx ("home" variant)
 - src/components/home/books-section.tsx, book-roll.tsx (shared rolling strip), partners-strip.tsx
 - src/components/home/salient-features.tsx, salient-ring.tsx; public/images/logo-emblem.svg
 - src/components/home/progress-dashboard.tsx (yellow band, glass stat cards, icons)
 - src/components/site-shell/footer.tsx, social-links.tsx; src/content/site-shell.ts, home.ts, admin.ts
 - src/app/globals.css (tokens, coverflow, rolling strip, salient ring, stroke)
 - removed: find-us-nearby, quick-links, books-carousel, partners-carousel, top-bar, header scroll collapse, five unused image files, unused tokens
 - specs/001, specs/006 (spec, contracts, data-model), docs/architecture.md
 - e2e: home-cards, home-inspiration, admin-home-news-band, home-books, home-salient, home-partners, home-dashboard, footer, header-scroll, shell-careers-links, desktop-navigation, admin-home-page, admin-home-layout
tests:
 - vitest (home, site-shell, content, site-search): all pass
 - playwright (chromium + admin, workers 1): home, footer, contact-and-social, shell-careers-links, desktop-navigation, site-search pass, except the two noted below
---

## Prompt

Over this session the owner gave a sequence of public-site layout requests (admin untouched, theme colours and fonts unchanged, no new colours), most of them as "report first, do not implement until I've seen it", then answers, then "go ahead". In order:

1. **Header and hero** (PHR 0007) and **full-height hero, remove Find Us Nearby** (PHR 0008).
2. **Quick-access cards** to a looping coverflow (three visible of four), cards are buttons that flip (hover, tap, focus), the link on the back, swipe, auto-advance (later "3 seconds for each card"), reduced-motion cross-fade; frame cost on a 4x-throttled profile; later a grey section band, frosted-glass faces, a heading ("Explore Dar-e-Arqam Schools") with a hand-drawn yellow stroke that draws on scroll.
3. **Inspiration section**: navy full-width band for heading and supporting line, logo removed; stroke removed there.
4. **Latest News**: yellow band header (heading centred, "News" pill, supporting line), restyled cards (5:4 cover token, date, 3-line title, one-line CSS-only excerpt, footer row, whole card one link, Urdu mirrored), outlined "View all news" button. Heading "Latest News and Highlights from Our Campus" (pending approval), exactly two lines at 1024/1440.
5. **Books**: full-width navy band, text left and a continuously rolling cover strip right (seamless loop, edge fades, pauses, reduced motion, fewer than three static, none leaves text only). Heading "Explore Our Course Books" (pending approval).
6. **Salient Features**: text and "Read more" beside four features turning in a circle with counter-rotating items (also on phones, smaller), emblem-only logo in the centre, descriptions removed.
7. **Partners**: carousel replaced by a ticker (the same strip component, reverse direction, no hover pause, fade in the band colour), "Our Partners" heading with the yellow stroke, logos larger, proper spacing; Ujala removed ("Arqam Magazine" matched no entry: the owner said to leave it, so eight logos remain).
8. **Progress Dashboard**: narrower stats column (960px token), shorter band, photo replaced by yellow, stats as frosted-glass cards with number and one label only, Font Awesome icons. The icon quick-links section removed, ticker moved into its place.
9. **E2E speed proposal** (only a proposal): width reductions, warm-up versus a production build, smoke tier, slowest ten, obsolete specs.
10. **Footer redesign**: four-column white footer (owner reversed navy to white), Quick Links, Portal Links, Contact Us from Settings, generated copyright year, developer credit kept, no Campuses.

## Response snapshot

Reported before implementing wherever asked (specs touched, data sources, admin fields orphaned, risks). Implemented each change with the smallest viable shared components: `SectionHeading` (stroke, tones, divider), `HeadingStroke`, `RollingStrip` (one strip for books and partners, with `kind`, `direction`, `pauseOnHover`, `fadeColor`; renamed from `BookRoll` on the owner's say-so), `SalientRing`, `HomeNewsCard`. Deviations from das.edu.pk are recorded in the 006 spec's Deviations table; FR-008 and FR-016/FR-025 amended; PRD sections (5.1, 8) flagged for the owner, never edited.

## Outcome

- ✅ Impact: all the requested home-page and footer changes are in the working tree (nothing committed). Dead code and tokens removed along the way (find-us tokens, inspiration logo token, quick-links tokens, partner-logo token, footer tokens, carousel per-view constant).
- 🧪 Tests: new and updated specs listed above. Contrast measured in the browser: white on navy 13.81:1; navy on yellow 12.86:1; navy on the glass card 12.98:1; footer navy on white 13.81:1, muted grey on white 4.67:1. Frame cost (4x CPU throttle, a proxy, production builds): quick-access cards and rolling strips and the turning circle all median 16.7 ms; blur on the cards was costly at phone width so it is limited to mouse devices. The last run for the larger partners ticker was inconclusive (the machine was loaded; the still baseline was as janky), so it should be re-measured on a quiet machine.
- 📁 Files: see front matter.
- 🔁 Next prompts: (a) (resolved: leave the partners as they are); (b) (done: renamed to `RollingStrip`); (c) pending-client-approval texts (news heading, books heading and text, salient paragraph, footer description); (d) real-phone check before go-live; (e) PRD sections to update; (f) delete the stale `footer.spec` leftovers now rewritten, and fix the mobile site-search spec (ambiguous "Contact" locator, failing before this work).
- 🧠 Reflection: LCP stopped being meaningful for a viewport-sized hero (Chrome ignores full-viewport images), so image-ready time was measured instead. Tailwind v4's `outline-none` cancels later `outline-*` utilities, and `transition-colors` makes computed outline colours read mid-transition in tests.

## Evaluation notes (flywheel)

- Known failures not caused by this work: `site-search.spec` mobile test (strict-mode "Contact" locator, failing before); a few DB-backed specs time out when the Atlas test database is slow (they pass on retry).
- The user prompts were long and multi-part; this record summarises them in order rather than quoting each one in full.

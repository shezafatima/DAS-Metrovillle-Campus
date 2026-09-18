---
id: 0011
title: Build real search verify scroll
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: [search, scroll, scope-change, fidelity]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/lib/site-search.ts
 - src/lib/site-search.test.ts
 - src/components/site-shell/search-box.tsx
 - src/components/site-shell/search-box.test.tsx
 - src/components/site-shell/header.tsx
 - src/components/site-shell/nav-mobile.tsx
 - src/components/site-shell/nav-mobile.test.tsx
 - e2e/site-search.spec.ts
 - specs/001-site-shell/spec.md
 - docs/prd.md
tests:
 - npm test (Vitest) — 8 files, 36 tests, all passing
 - npm run test:e2e (Playwright, chromium) — 51/52 passing, 1 intentionally skipped (no social link configured yet)
 - npx tsc --noEmit — clean (after regenerating stale Next.js route types with `npx next typegen`)
---

## Prompt

"search bar is still not added , where are the social links and is navbar
is sticky and top header goes under it on scroll as in the refrence"

## Response snapshot

Three threads:

1. **Scroll behavior** — verified via screenshot (already built in a
   prior turn): the yellow portal bar collapses/scrolls away while the
   nav row stays pinned at the top, matching the reference exactly. No
   change needed, just confirmed.
2. **Social links** — explained `contactInfo.social` is intentionally
   empty (FR-012 omits rather than fabricates a link); asked whether the
   user would supply real URLs, add clearly-marked placeholders, or leave
   it. They chose to supply real URLs (not yet received as of this PHR).
3. **Search bar** — asked whether to add a cosmetic icon or build real
   search (previously ruled out-of-scope). User chose "build real site
   search." Implemented a real, working search scoped to what the project
   actually has to search — navigationItems (top-level + dropdown
   sub-pages) — rather than fabricating a full-text index over content
   that doesn't exist (most pages are still shell placeholders). Built
   `src/lib/site-search.ts` (flatten + substring-match `searchSite()`,
   unit tested) and `SearchBox` (icon → expanding popout, listbox of
   matches, Enter/submit navigates to the first match), wired into both
   the desktop header and the mobile drawer.

The user then supplied two new reference screenshots
(`screenshots/search.png`, `screenshots/Search-popout.png`) showing the
live site's actual search popout (bordered input + black square submit
button, placeholder "Search...") and a full WordPress search-results page
— confirming the interaction pattern already built was right, but revealing
the reference does real full-text search over blog-style content (which
this project doesn't have yet). Restyled `SearchBox` to match the popout
exactly (removed a separate close button in favor of the black submit
button, changed placeholder text) and updated `spec.md` (new FR-026,
Out of Scope narrowed to "full-text content search," a new Assumptions
entry) and `docs/prd.md` to document the scoping decision instead of
leaving them contradicting the code.

Two real bugs surfaced during testing: (1) a stale/corrupted
`.next/dev/types/validator.ts` from earlier dev-server restarts made
`tsc` fail on unrelated syntax — fixed by running `npx next typegen` to
regenerate route types properly (noted for future: run this after adding
new dynamic routes rather than relying on dev-server on-demand
generation); (2) a mobile-only e2e failure where opening search from
inside the already-focus-trapped mobile drawer never showed the input —
traced to a blur-based auto-close handler on `SearchBox` racing against
the drawer's own focus-trap, mirroring the exact pattern of the nav-dropdown
click race fixed earlier this feature. Removed the blur-close entirely
(Escape already closes it) rather than trying to out-clever the race.

## Outcome

- ✅ Impact: sticky scroll behavior confirmed correct; real, working
  site search shipped (desktop + mobile) scoped honestly to nav titles;
  spec/PRD docs updated to match; social links still pending real URLs
  from the user.
- 🧪 Tests: Vitest 36/36; Playwright 51/52 (1 skip by design); tsc clean.
- 📁 Files: see list above.
- 🔁 Next prompts: once the user supplies real Facebook/YouTube/Instagram
  URLs, add them to `contactInfo.social` in `src/content/site-shell.ts` —
  everywhere they render (top bar, footer bottom bar) is already built
  and tested against the omit-when-empty contract.
- 🧠 Reflection: This is the second time in this feature that a
  fragile blur/focus-based auto-close raced against another focus-managing
  system (Base UI's Drawer trap, previously the nav-dropdown's own hover
  state) — worth defaulting to "close only on Escape/explicit action, not
  on blur" for any interactive popover nested inside a modal from the
  start, rather than discovering the race each time.

## Evaluation notes (flywheel)

- Failure modes observed: none in the delivered feature; two real bugs
  (stale generated types, blur/focus-trap race) were caught and fixed
  during this same turn's testing.
- Graders run and results (PASS/FAIL): Vitest PASS, Playwright PASS
  (post-fix), tsc PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): if a future interactive
  popover needs to live inside a modal (drawer/dialog), skip blur-based
  auto-close from the first draft and rely on Escape/explicit-close only.

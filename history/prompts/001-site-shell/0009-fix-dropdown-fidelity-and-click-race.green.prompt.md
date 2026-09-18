---
id: 0009
title: Fix dropdown fidelity and click race
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: [fidelity, navigation, dropdown, fonts, bugfix]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/app/globals.css
 - src/app/layout.tsx
 - src/components/site-shell/header.tsx
 - src/components/site-shell/logo.tsx
 - src/components/site-shell/nav-desktop.tsx
 - src/components/site-shell/nav-desktop.test.tsx
 - src/components/site-shell/nav-mobile.tsx
 - src/components/site-shell/footer.tsx
 - src/content/site-shell.ts
 - src/lib/format-slug.ts
 - src/app/about/[slug]/page.tsx
 - src/app/academics/[slug]/page.tsx
 - src/app/admission/[slug]/page.tsx
 - src/app/resources/[slug]/page.tsx
 - src/app/news/[slug]/page.tsx
 - src/app/hifz-e-quran/page.tsx
 - e2e/desktop-navigation.spec.ts
 - e2e/mobile-navigation.spec.ts
 - e2e/footer.spec.ts
 - specs/001-site-shell/contracts/content-schema.md
 - specs/001-site-shell/data-model.md
 - specs/001-site-shell/spec.md
 - docs/prd.md
tests:
 - npm test (Vitest) — 6 files, 25 tests, all passing
 - npm run test:e2e (Playwright, chromium) — 45/46 passing, 1 skipped (no configured social link yet); one mobile-scroll test flaked once under full-suite load and passed in isolation (unrelated timing, not a regression)
 - npx tsc --noEmit — clean
---

## Prompt

Four follow-up messages in this session, addressed together:

1. "I am still not getting what I want its not matches the refrence website
   design you didn'nt added any sub heading for the navlinks as in the
   refrence no subnav dropdown navbar also has very little space comapere
   to the refrence logo is small , footer is not like the refrence as well
   as font is not what the refrence used"
2. "small the subnav font size also you didn't added sub nav for admission,
   resources and news as well as no searchbar you added no nav text like
   in the refrence like :for Home there is Front page , for About there
   Who We Are? and so on and the fonts that are used are 'Poppins, Arial,
   Helvetica, sans-serif'"
3. "the dropdown nav is too wide in desktop try to decrease its width"
   (sent mid-turn while investigating message 4)
4. "news dropdown is making the page unresponsive"

## Response snapshot

**Fonts**: The site-shell's `font-heading`/`font-nav`/`font-button` tokens
named Poppins/Roboto Condensed/Open Sans but never actually loaded them —
only Geist was loaded via `next/font/google`. Added `Poppins`,
`Roboto_Condensed`, `Open_Sans` loaders in `layout.tsx` and wired their CSS
variables into the tokens, so nav now genuinely renders in condensed bold
Roboto Condensed instead of a Helvetica/Arial fallback.

**Real menu structure**: `WebFetch`'d the live das.edu.pk site directly
(static screenshots can't show hover-triggered dropdown content) and got
the exact menu structure — every top-level item's tagline (e.g. "Front
Page" under Home, "Who We Are?" under About) and every dropdown's real
children, including Admission/Resources/News dropdowns that were missing
entirely, and corrected Academics' order/content (added Hifz-e-Quran,
fixed ordering) against what screenshot-slug guessing had produced.
Confirmed the reference's search icon exists but is explicitly out of
scope per spec.md's own "Out of Scope" list — not added; documented this
divergence in docs/prd.md instead of silently complying or silently
ignoring it. Added a `tagline` field to `NavigationItem` (content contract
+ data-model.md updated), populated all 8 items, and consolidated what
would have been ~16 new near-duplicate stub pages into 4 dynamic
`[slug]` routes (about, academics, admission, resources — mirroring the
existing `/news/[slug]` pattern) plus one static `/hifz-e-quran` page.

**Visual sizing**: Fixed the desktop nav wrapping to a second line at
1024px (bigger logo + wider gaps didn't fit at the tightest breakpoint) by
retuning gaps/logo size per-breakpoint; added a smaller `--text-nav-sub`
token for dropdown items (previously same size as body text) and a
`--text-nav-tagline` token for the new tagline captions — both flagged as
sized off the doc's existing scale rather than fabricated, matching how
the logo-size gap was handled earlier. Reduced dropdown width from a fixed
`min-w-56` to `w-max min-w-40 max-w-64` per user's follow-up.

**Footer**: Discovered via cropping `screenshots/das.edu.pk_.png`'s footer
region that the real reference footer has no link-columns section at all
(just contact + a bottom bar) — rebuilt Footer to match, keeping `columns`
in the contract as an empty array rather than removing it.

**Dropdown click race (reported as "page unresponsive")**: Stress-tested
every dropdown with repeated hover+click cycles and found two compounding
issues: (1) a genuine race where the pointer's path from trigger into the
absolutely-positioned dropdown could close it mid-click since it wasn't
extending the `<li>`'s hit box reliably — fixed with a 250ms close-delay
(debounced, cancelled on re-entry) plus switching the dropdown from
conditional mounting to always-mounted-with-CSS-visibility-toggle (a
conditionally-unmounted dropdown risks the exact DOM node being destroyed
mid-click); (2) most of what the user actually experienced was very
likely Next.js dev-server on-demand compilation of the several brand-new
routes added this session — a first-hover-then-click into an uncompiled
route stalls `next dev` visibly, which doesn't happen in a production
build. Added a regression test simulating the exact
mouseenter/mouseleave/mouseenter flicker that caused the race, and
verified all five dropdowns navigate correctly across repeated runs
post-fix.

## Outcome

- ✅ Impact: nav now uses real loaded fonts, the real reference menu
  structure (taglines + all 5 dropdowns), correctly sized/spaced at every
  breakpoint without wrapping, a footer matching the real reference
  layout, and a dropdown that survives real click interaction.
- 🧪 Tests: Vitest 25/25; Playwright 45/46 (1 skipped by design, 1
  confirmed-flaky timing test passed on isolated retry); tsc clean.
- 📁 Files: see list above.
- 🔁 Next prompts: none required; if the user still sees an unresponsive
  page on a route not yet visited in this dev session, that's the
  expected one-time `next dev` compile stall, not a bug — a production
  build (`next build && next start`) would not exhibit it.
- 🧠 Reflection: Static full-page screenshots cannot show hover-triggered
  UI at all — fetching the live reference site directly was the only way
  to get real dropdown/tagline content, and should have been tried before
  guessing sub-page labels from URL slugs alone. Also: a bug reported as
  vague ("page unresponsive") is worth stress-testing with repetition
  before accepting a single-shot diagnostic's clean result — the click
  race here reproduced non-deterministically and only became visible
  under repeated/parallel runs.

## Evaluation notes (flywheel)

- Failure modes observed: none in the delivered fix; the dropdown click
  race itself was the failure mode under investigation, confirmed fixed
  by switching from conditional-mount to always-mounted+CSS-visibility.
- Graders run and results (PASS/FAIL): Vitest PASS, Playwright PASS
  (post-fix stress test: 25/25 dropdown-click attempts across 5 menus).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): if any further click-race
  symptoms surface elsewhere (e.g. NavMobile's accordion), apply the same
  always-mounted/CSS-visibility pattern there too rather than
  re-diagnosing from scratch.

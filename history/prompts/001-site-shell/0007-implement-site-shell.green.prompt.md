---
id: 0007
title: Implement site shell
stage: green
date: 2026-09-16
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: /sp.implement
labels: [implement, site-shell, header, footer, navigation, accessibility]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/app/globals.css
 - src/app/layout.tsx
 - src/app/not-found.tsx
 - src/app/page.tsx
 - src/app/page.test.tsx
 - src/app/about/page.tsx
 - src/app/campuses/page.tsx
 - src/app/academics/page.tsx
 - src/app/admission/page.tsx
 - src/app/resources/page.tsx
 - src/app/news/page.tsx
 - src/app/news/[slug]/page.tsx
 - src/app/contact/page.tsx
 - src/content/site-shell.ts
 - src/content/site-shell.test.ts
 - src/lib/rtl-text.ts
 - src/components/site-shell/skip-link.tsx
 - src/components/site-shell/page-placeholder.tsx
 - src/components/site-shell/logo.tsx
 - src/components/site-shell/header.tsx
 - src/components/site-shell/header-scroll-collapse.tsx
 - src/components/site-shell/nav-desktop.tsx
 - src/components/site-shell/nav-desktop.test.tsx
 - src/components/site-shell/nav-mobile.tsx
 - src/components/site-shell/nav-mobile.test.tsx
 - src/components/site-shell/top-bar.tsx
 - src/components/site-shell/top-bar.test.tsx
 - src/components/site-shell/footer.tsx
 - src/components/site-shell/footer.test.tsx
 - e2e/home.spec.ts
 - e2e/desktop-navigation.spec.ts
 - e2e/mobile-navigation.spec.ts
 - e2e/contact-and-social.spec.ts
 - e2e/footer.spec.ts
 - e2e/header-scroll.spec.ts
 - e2e/shell-and-placeholders.spec.ts
 - vitest.setup.ts
 - specs/001-site-shell/tasks.md
tests:
 - npm test (Vitest) — 6 files, 24 tests, all passing
 - npm run test:e2e (Playwright, chromium) — 47 tests, 42 passing, 5 intentionally skipped (no navigationItems/contactInfo.social entry has children/values yet — guarded, self-activating once content changes)
 - npx tsc --noEmit — clean
 - npx eslint . — 0 errors (8 pre-existing warnings in unrelated research/ scripts)
---

## Prompt

/sp.implement

(No additional user input text was provided.)

## Response snapshot

Ran `check-prerequisites.ps1 -RequireTasks -IncludeTasks`, confirmed the
`requirements.md` checklist was 16/16 complete (PASS, no gate needed), and
executed all 41 tasks in `specs/001-site-shell/tasks.md` phase by phase,
committing to Vitest/TypeScript/ESLint after each component and to
Playwright (against the dev server already running on :3000, per explicit
user choice when Playwright's own :3100 webServer start was blocked by
Next's single-dev-server lock) after each user-story phase:

- **Setup/Foundational**: extended `globals.css`'s `@theme` with every
  design token from `research/design-tokens.md` (colors, fonts, type scale,
  spacing, radii, shadow, container, motion) — reusing Tailwind's built-in
  `lg:` (1024px) breakpoint instead of duplicating it, since it already
  equals the reference's measured collapse point. Built
  `src/content/site-shell.ts` (the typed nav/contact/footer contract) with
  its Vitest contract tests, `SkipLink`, `PagePlaceholder`, `Logo` (real
  `public/images/logo.svg`, alt text, viewport-scaled sizing), 8 route
  stubs + `not-found.tsx`, and wired `SkipLink`/`<main id="main-content">`
  into `layout.tsx`.
- **US1 Desktop nav**: `NavDesktop` (active/`aria-current` via
  `usePathname`, hover/focus-driven dropdowns with `aria-expanded`),
  `Header`, wired into `layout.tsx`.
- **US2 Mobile nav**: `NavMobile` built on `@base-ui/react`'s `Drawer` +
  `Accordion` — `modal` gives focus trap + scroll lock for free (FR-008/
  FR-009 verified by e2e, not hand-rolled); switched from `Drawer.Close`
  render-prop links (which forced `role="button"` onto them) to a
  controlled Drawer with plain `<Link onClick={() => setOpen(false)}>` so
  menu items keep native link semantics.
- **US3 Contact/social**: `TopBar` with `tel:`/`mailto:` links and
  omit-when-empty social icons — using `lucide-react`'s generic `Link2`
  icon with an sr-only platform label, since this locked lucide-react
  version ships no brand/social icons (Constitution II — no new
  dependency).
- **US4 Footer**: columns/quick links/bottom bar from `footerContent`,
  render-time copyright year; wired into `layout.tsx`.
- **US5 Header scroll**: `HeaderScrollCollapse` (isolated client component)
  uses `motion/react`'s `useScroll`/`useMotionValueEvent` to collapse the
  top bar past a threshold at `lg:` only — grounded in the `<html>` classes
  actually captured in every `research/tokens/home-*.json` sample
  (`fusion-sticky-header no-tablet-sticky-header no-mobile-sticky-header
  avada-sticky-shrinkage`), not guessed.
- **US6 verification**: e2e-confirmed every sitemap route, the wrapped
  not-found page, and skip-link-first-focus all hold with the complete
  shell wired.
- **Polish**: added `dir="auto"` + a `font-body-urdu` fallback (via a new
  `isRtlScript` Arabic-script detector) and `flex-wrap` on the desktop menu
  for FR-022; added a token-fidelity e2e check against
  `research/design-tokens.md`'s "Main menu item" row, which caught a real
  bug — Tailwind v4's `var(--tw-font-weight, 700)` composite-token fallback
  wasn't resolving (a `*{--tw-font-weight:initial}` reset rule always wins),
  fixed by pairing `text-nav` with an explicit `font-bold` +
  `tracking-(--text-nav--letter-spacing)` everywhere instead of relying on
  the automatic pairing; ran the full Vitest + Playwright + tsc + eslint
  suites clean; visually spot-checked the running shell at 375/1440px via
  Playwright screenshots (matches the reference's structure — top bar,
  logo-left/nav-right header with mobile hamburger collapse, footer with
  contact + columns + bottom bar).

## Outcome

- ✅ Impact: All 6 user stories (desktop nav, mobile nav, contact/social,
  footer, header scroll, shared layout/placeholders) implemented and
  independently e2e-verified; `specs/001-site-shell/tasks.md` fully checked
  off (T001–T041).
- 🧪 Tests: Vitest 24/24 passing; Playwright 42/47 passing + 5 intentionally
  skipped (dropdown/social-link mechanisms are content-driven and currently
  have zero real entries to exercise — covered deterministically with
  fixture data instead, per spec.md's Assumptions); `tsc --noEmit` and
  `eslint` both clean.
- 📁 Files: see list above — 37 files created/modified across
  `src/app`, `src/components/site-shell`, `src/content`, `src/lib`, `e2e/`,
  plus `vitest.setup.ts` (added missing `afterEach(cleanup)` — RTL doesn't
  auto-register it without `test.globals: true`) and `tasks.md`.
- 🔁 Next prompts: `/sp.analyze` for a final cross-artifact consistency
  pass, or start the next feature (real Home page sections, per
  docs/prd.md §5.1) now that every route renders inside this shell.
- 🧠 Reflection: The port-3000 dev-server conflict and the two real bugs
  found only by writing actual assertions (Drawer.Close's forced
  `role="button"`, Tailwind's non-resolving `--tw-font-weight` fallback)
  are exactly why the task list front-loaded real running tests rather than
  trusting the plan's stated mechanisms on faith.

## Evaluation notes (flywheel)

- Failure modes observed: none in the delivered code; two real bugs were
  caught and fixed during implementation itself (see Reflection).
- Graders run and results (PASS/FAIL): Vitest PASS (24/24), Playwright PASS
  (42/42 non-skipped), tsc PASS, eslint PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): once real Metroville
  phone/email/address and at least one nav sub-page are supplied, the
  currently-skipped e2e assertions (dropdown open/close, social link) will
  start running against real content with no test-code change — worth
  re-running the suite at that point to confirm they go green.

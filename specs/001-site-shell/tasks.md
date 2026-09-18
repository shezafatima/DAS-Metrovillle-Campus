---

description: "Task list for Site Shell implementation"
---

# Tasks: Site Shell

**Input**: Design documents from `/specs/001-site-shell/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/content-schema.md, quickstart.md

**Tests**: Included — plan.md's Testing section and `contracts/content-schema.md`'s contract-test checklist explicitly require Vitest unit tests and one Playwright e2e spec per user story (spec.md SC-006).

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to a spec.md user story (US1–US6); Setup/Foundational/Polish tasks carry no story label
- File paths are exact and relative to the repository root

## Path Conventions

Single existing Next.js app (plan.md Structure Decision) — `src/`, `e2e/` at repository root. No new project/package.

---

## Phase 1: Setup

**Purpose**: Establish the design-token foundation every component in every story must use (Constitution V — no raw values in component code).

- [X] T001 Extend the `@theme` block in `src/app/globals.css` with every design token from `research/design-tokens.md`'s "Suggested token names" section (`color-primary`, `color-accent`, `color-cta`, `color-text*`, `color-surface`, `color-neutral-100`, `font-body`, `font-heading`, `font-nav`, `font-button`, the `text-h2`/`text-h3`/`text-body`/`text-nav`/`text-button` type-scale tokens, `space-section-*`, `radius-*`, `shadow-card`, `container-max-width`, `container-gutter-x`, `motion-fast`/`motion-medium`/`motion-slide`/`motion-fade`), plus a custom `1024px` min-width Tailwind breakpoint for the desktop/mobile menu gate (research.md §1; FR-024)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The typed content contract and shared scaffolding every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create `src/content/site-shell.ts` exporting `SocialPlatform`, `NavigationItem`, `ContactInfo`, `FooterLink`, `FooterColumn`, `FooterContent` types and `navigationItems`, `contactInfo`, `footerContent` values, per `specs/001-site-shell/contracts/content-schema.md` and `data-model.md` — fixed nav order (Home, About, Campuses, Academics, Admission, Resources, News, Contact), empty `children` for About/Academics, marked Metroville placeholder contact values, no "Franchise Offer" entry (FR-001, FR-010, FR-013, FR-014, FR-020, FR-021)
- [X] T003 Vitest contract tests in `src/content/site-shell.test.ts`: `navigationItems` renders in the exact fixed order, no entry labeled "Franchise Offer", `contactInfo.phone`/`contactInfo.email` are non-empty strings (contracts/content-schema.md contract tests) — depends on T002
- [X] T004 [P] Create `SkipLink` server component in `src/components/site-shell/skip-link.tsx` — a "Skip to content" link targeting `#main-content` (FR-019)
- [X] T005 [P] Create `PagePlaceholder` server component in `src/components/site-shell/page-placeholder.tsx` for not-yet-built routes (FR-017; research.md §4)
- [X] T006 [P] Create `Logo` server component in `src/components/site-shell/logo.tsx` rendering `public/images/logo.svg` with alt text `"Dar-e-Arqam School Metroville Campus"`, linking to `/`, sized to match `screenshots/`/`research/design-tokens.md` at each viewport (no placeholder) — per plan.md
- [X] T007 [P] Create route stub pages rendering `PagePlaceholder`: `src/app/about/page.tsx`, `src/app/campuses/page.tsx`, `src/app/academics/page.tsx`, `src/app/admission/page.tsx`, `src/app/resources/page.tsx`, `src/app/news/page.tsx`, `src/app/news/[slug]/page.tsx`, `src/app/contact/page.tsx` (FR-017; docs/prd.md §4) — depends on T005
- [X] T008 [P] Replace the create-next-app scaffold in `src/app/page.tsx` with `PagePlaceholder` (FR-017) — depends on T005
- [X] T009 [P] Create global `src/app/not-found.tsx` with a link back to `/` (FR-018)
- [X] T010 Update `src/app/layout.tsx`: replace the create-next-app `metadata`, render `SkipLink` as the first child of `<body>`, and wrap `{children}` in `<main id="main-content">` (FR-019) — depends on T004
- [X] T011 Update `e2e/home.spec.ts` to stop asserting the removed create-next-app scaffold text — depends on T008

**Checkpoint**: Design tokens, content contract, and route/layout scaffolding are in place — user story implementation can now begin.

---

## Phase 3: User Story 1 - Desktop navigation (Priority: P1) 🎯 MVP

**Goal**: At desktop width, the logo returns visitors home and a fixed-order main menu (with hover/keyboard dropdowns and active-item marking) reaches every other page.

**Independent Test**: Load the site at desktop width, click the logo to confirm it returns home, then tab and click through every header menu item and dropdown to confirm each lands on its page.

### Tests for User Story 1

- [X] T012 [P] [US1] Vitest unit test for active-item/`aria-current` detection logic in `src/components/site-shell/nav-desktop.test.tsx`
- [X] T013 [P] [US1] Playwright e2e `e2e/desktop-navigation.spec.ts` covering Acceptance Scenarios 1–5 (logo→home, fixed menu order, dropdown open on hover/focus, dropdown close, active-item marking) at 1024px and 1440px

### Implementation for User Story 1

- [X] T014 [US1] Create `NavDesktop` `"use client"` component in `src/components/site-shell/nav-desktop.tsx`: renders `navigationItems` in fixed order, `usePathname()`-based active/`aria-current` marking, CSS `:hover`/`:focus-within`-driven dropdowns with minimal JS for `aria-expanded` and the "closes once neither pointer nor focus remains" condition (FR-001–FR-004; research.md §6–§7) — depends on T002
- [X] T015 [US1] Create `Header` server component in `src/components/site-shell/header.tsx` composing `Logo` + `NavDesktop` (TopBar and the mobile menu are added in later stories) — depends on T006, T014
- [X] T016 [US1] Wire `Header` into `src/app/layout.tsx` between `SkipLink` and `<main>` — depends on T010, T015

**Checkpoint**: Desktop navigation is fully functional and independently testable at 1024px and above.

---

## Phase 4: User Story 2 - Mobile navigation (Priority: P1)

**Goal**: Below the 1024px breakpoint, a mobile menu replaces the full header menu, supports expand/collapse of sub-pages, and closes cleanly without leaving focus stranded or the page scrolling behind it.

**Independent Test**: Load the site at a mobile/tablet width, open the menu via its button, navigate into and out of an item with sub-pages, and close the menu by each of the three supported methods (link chosen, close control, Escape).

### Tests for User Story 2

- [X] T017 [P] [US2] Vitest unit test for mobile sub-page expand/collapse state logic in `src/components/site-shell/nav-mobile.test.tsx`
- [X] T018 [P] [US2] Playwright e2e `e2e/mobile-navigation.spec.ts` covering Acceptance Scenarios 1–6 (collapse breakpoint, open, expand/collapse sub-pages, close by link/close-control/Escape, scroll lock, focus trap + focus return) at 375px and 768px

### Implementation for User Story 2

- [X] T019 [US2] Create `NavMobile` `"use client"` component in `src/components/site-shell/nav-mobile.tsx` using `@base-ui/react` primitives for focus containment/Escape (research.md §5): lists all top-level `navigationItems`, expands/collapses items with `children` in place, closes on link selection/close control/Escape, returns focus to the menu button (FR-006, FR-007, FR-009) — depends on T002
- [X] T020 [US2] Add scroll-lock while the mobile menu is open in `src/components/site-shell/nav-mobile.tsx` (FR-008) — depends on T019
- [X] T021 [US2] Add open/close motion to `src/components/site-shell/nav-mobile.tsx` via `motion/react`, respecting `prefers-reduced-motion` — depends on T019
- [X] T022 [US2] Update `src/components/site-shell/header.tsx` to render a menu button + `NavMobile` below the `1024px` breakpoint and hide them at `1024px`+, complementary to `NavDesktop` (FR-005) — depends on T015, T019

**Checkpoint**: Desktop and mobile navigation are both fully functional.

---

## Phase 5: User Story 3 - Contact details and social links (Priority: P2)

**Goal**: The Metroville campus's phone, email and address appear in the top bar and footer as actionable links, configured social links open in a new tab, and everything is sourced from the single content file.

**Independent Test**: View any public page, confirm phone/email/address appear in both the top bar and footer, confirm the phone and email are actionable links, confirm configured social links open in a new tab, and confirm editing a value in the content source changes what's displayed everywhere.

### Tests for User Story 3

- [X] T023 [P] [US3] Vitest unit tests for `tel:`/`mailto:` href construction and social-link omission-when-empty in `src/components/site-shell/top-bar.test.tsx`
- [X] T024 [P] [US3] Playwright e2e `e2e/contact-and-social.spec.ts` covering Acceptance Scenarios 1–5

### Implementation for User Story 3

- [X] T025 [US3] Create `TopBar` server component in `src/components/site-shell/top-bar.tsx` reading `contactInfo`: phone as a `tel:` link, email as a `mailto:` link, address text, social icons (`lucide-react`) rendered only for configured platforms with `target="_blank" rel="noopener noreferrer"` (FR-010–FR-013) — depends on T002
- [X] T026 [US3] Update `src/components/site-shell/header.tsx` to compose `TopBar` above the desktop/mobile nav (FR-010) — depends on T015, T022, T025

**Checkpoint**: Contact info and social links are visible and actionable on every page.

---

## Phase 6: User Story 4 - Footer (Priority: P2)

**Goal**: Every public page shows a footer with columns, quick links and a bottom bar matching the reference layout, populated with Metroville content and a render-time copyright year.

**Independent Test**: View the footer on any public page and confirm its columns, quick links and bottom bar match the reference layout with Metroville content, and that the copyright year is correct on the date of viewing.

### Tests for User Story 4

- [X] T027 [P] [US4] Vitest unit test for render-time copyright-year computation in `src/components/site-shell/footer.test.tsx`
- [X] T028 [P] [US4] Playwright e2e `e2e/footer.spec.ts` covering Acceptance Scenarios 1–2

### Implementation for User Story 4

- [X] T029 [US4] Create `Footer` server component in `src/components/site-shell/footer.tsx`: columns, quick links and bottom bar from `footerContent`, contact details from `contactInfo`, copyright year via `new Date().getFullYear()` (FR-014, FR-015) — depends on T002
- [X] T030 [US4] Wire `Footer` into `src/app/layout.tsx` after `<main>` — depends on T016, T029

**Checkpoint**: The full page frame (header + footer) is complete on every page.

---

## Phase 7: User Story 5 - Header scroll behavior (Priority: P3)

**Goal**: The header's scroll behavior (sticky or not, any size/background change) reproduces the reference site's behavior exactly.

**Independent Test**: Scroll a public page from top to bottom and back on desktop and mobile, and compare the header's behavior against the reference site's recorded behavior.

### Tests for User Story 5

- [X] T031 [P] [US5] Playwright e2e `e2e/header-scroll.spec.ts` covering Acceptance Scenarios 1–2 at desktop and mobile widths, asserting against the sticky/size/background behavior recorded in `research/design-tokens.md`

### Implementation for User Story 5

- [X] T032 [US5] Implement header scroll behavior (sticky positioning, and any scroll-threshold size/background change) in `src/components/site-shell/header.tsx` using `motion/react` for the transition, respecting `prefers-reduced-motion` (FR-016) — depends on T026

**Checkpoint**: Header scroll behavior matches the reference site.

---

## Phase 8: User Story 6 - Shared layout and placeholder pages (Priority: P3)

**Goal**: Every PRD sitemap route renders inside the shared shell (placeholder if unbuilt), unknown URLs get a shell-wrapped "not found" page, and the skip-to-content link is the first thing focused on Tab.

**Independent Test**: Navigate to every route listed in the PRD sitemap and confirm each renders inside the shell, navigate to a URL outside the sitemap and confirm a "page not found" page renders inside the shell with a link home, and confirm the skip-to-content link is the first element focused on Tab.

### Tests for User Story 6

- [X] T033 [P] [US6] Playwright e2e `e2e/shell-and-placeholders.spec.ts` covering Acceptance Scenarios 1–3: every PRD sitemap route renders inside the shell, an unmatched URL renders `not-found` inside the shell with a link home, and the skip link is the first Tab focus

### Implementation for User Story 6

- [X] T034 [P] [US6] Verify every route stub from T007/T008 renders its `PagePlaceholder` inside the complete shell (Header + Footer now wired) and fix any route that doesn't — depends on T007, T008, T030
- [X] T035 [P] [US6] Verify `src/app/not-found.tsx` renders inside the complete shell with a working link back to `/` (FR-018) — depends on T009, T030
- [X] T036 [P] [US6] Verify `SkipLink` is the first focusable element and correctly moves focus to `#main-content` now that `Header` precedes it in the DOM order established in T016 (FR-019) — depends on T004, T016

**Checkpoint**: All 6 user stories are independently functional; every sitemap route and the not-found page render inside the complete shell.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Fidelity, accessibility and edge-case hardening across all stories.

- [X] T037 [P] Add a long-label/Urdu-text fixture case to `src/components/site-shell/nav-desktop.test.tsx` and `src/components/site-shell/nav-mobile.test.tsx` asserting no overlap/clipping regressions (FR-022)
- [X] T038 [P] Add computed-style/token fidelity assertions at 375/768/1024/1440px against `research/tokens/*.json` to the relevant `e2e/*.spec.ts` files (FR-024, SC-003)
- [X] T039 Manual keyboard/screen-reader pass across all shell interactive elements per `quickstart.md`'s Accessibility check (FR-023, SC-004)
- [X] T040 Run `npm test` and `npm run test:e2e`; fix any failures
- [X] T041 Run `quickstart.md`'s "Run it" and "Check it against the reference" steps end-to-end and confirm no deviations beyond the documented ones (no Franchise Offer, Metroville-only content) (SC-002, SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001, for token classes used by T004–T010) — BLOCKS all user stories.
- **User Stories (Phase 3–8)**: All depend on Foundational (Phase 2) completion.
  - US1 and US2 are both P1 and have no dependency on each other's *tests*, but both extend the same `header.tsx`, so US2's `header.tsx` edit (T022) is sequenced after US1's (T015).
  - US3 extends `header.tsx` again (T026), sequenced after US2 (T022).
  - US4 wires `Footer` into `layout.tsx` after US1 wires `Header` (T016).
  - US5 extends `header.tsx` again (T032), sequenced after US3 (T026).
  - US6's verification tasks (T034–T036) depend on the fully wired shell from US1–US4 (T007, T008, T009, T030).
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### Within Each User Story

- Tests are written first and must fail before implementation.
- Component creation before wiring it into `header.tsx`/`layout.tsx`.
- Story checkpoint reached only once its wiring task lands.

### Parallel Opportunities

- Foundational: T004, T005, T006 in parallel; then T007, T008, T009 in parallel once T005 is done.
- Each user story's test tasks (e.g., T012+T013, T017+T018) can run in parallel with each other.
- US6's verification tasks T034, T035, T036 can run in parallel (different files).
- Polish tasks T037 and T038 can run in parallel.
- Because `header.tsx` is extended by US1, US2, US3 and US5 in sequence, and `layout.tsx` by Foundational/US1/US4, those specific tasks cannot run in parallel across stories even though the stories are otherwise independently testable once each checkpoint lands.

---

## Parallel Example: Foundational Phase

```bash
# After T001 (tokens) and T002 (content file) land:
Task: "Create SkipLink server component in src/components/site-shell/skip-link.tsx"
Task: "Create PagePlaceholder server component in src/components/site-shell/page-placeholder.tsx"
Task: "Create Logo server component in src/components/site-shell/logo.tsx rendering public/images/logo.svg, alt 'Dar-e-Arqam School Metroville Campus', sized per viewport"

# After T005 (PagePlaceholder) lands:
Task: "Create route stub pages rendering PagePlaceholder (8 files under src/app/)"
Task: "Replace the create-next-app scaffold in src/app/page.tsx with PagePlaceholder"
Task: "Create global src/app/not-found.tsx with a link back to /"
```

## Parallel Example: User Story 1

```bash
Task: "Vitest unit test for active-item/aria-current detection logic in src/components/site-shell/nav-desktop.test.tsx"
Task: "Playwright e2e e2e/desktop-navigation.spec.ts covering Acceptance Scenarios 1-5"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1 (desktop navigation).
4. Complete Phase 4: User Story 2 (mobile navigation).
5. **STOP and VALIDATE**: both P1 stories deliver full site reachability on desktop and mobile — this is the MVP per spec.md.

### Incremental Delivery

1. Setup + Foundational → shell scaffolding ready.
2. US1 (desktop nav) → US2 (mobile nav) → **MVP reachable on every device**.
3. US3 (contact/social) → US4 (footer) → completeness layered on top.
4. US5 (scroll fidelity) → US6 (placeholder/not-found/skip-link verification) → polish and plumbing confirmed.
5. Phase 9 → fidelity, accessibility and edge-case hardening across all stories.

---

## Notes

- [P] tasks = different files, no dependency on an incomplete task.
- [Story] label maps a task to its spec.md user story for traceability; Setup/Foundational/Polish tasks carry none.
- `header.tsx` and `layout.tsx` are shared files extended across multiple stories — those specific tasks are sequenced, not parallel, even though each story remains independently testable once its checkpoint lands.
- Tests are written first per story and must fail before the matching implementation task.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

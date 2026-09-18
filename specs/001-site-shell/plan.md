# Implementation Plan: Site Shell

**Branch**: `001-site-shell` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-site-shell/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build the shared public site shell — top bar, header with desktop/mobile
main menu, footer, and the layout every public page renders inside —
exactly reproducing das.edu.pk's header/footer structure and behavior with
Metroville-specific content. All design values come exclusively from
`research/design-tokens.md` (extended into named Tailwind `@theme` tokens);
menu items, contact details, footer content and social links are read from
one typed content file (`src/content/site-shell.ts`) so editors change them
without touching layout code. Every PRD sitemap route renders inside the
shell (placeholder if unbuilt), unknown URLs get a shell-wrapped
"not found" page, and the shell is fully keyboard/screen-reader operable.
This is a presentational, static-content feature — no database, auth, or
API routes are introduced.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16.3.x (App Router), React 19 — versions already locked in `package.json`; no changes needed.
**Primary Dependencies**: Tailwind CSS v4 (tokens via `@theme` in `src/app/globals.css`), shadcn/ui + `@base-ui/react` (existing `Button`, and `@base-ui/react`'s primitives for the mobile menu's focus containment), `motion` (imported from `motion/react`, for mobile-menu open/close and any header scroll transition), `lucide-react` (menu/close/social/hamburger icons). All already present in `package.json` — no new dependencies.
**Storage**: N/A — menu items, contact info, footer content and social links live in one static typed TypeScript file (`src/content/site-shell.ts`), not a database.
**Testing**: Vitest (unit tests: content-file shape, `tel:`/`mailto:` href construction, active-item/current-page logic, copyright-year computation, social-link omission-when-empty) + Playwright (one e2e spec per user story, plus computed-style assertions against `research/tokens/*.json` at 375/768/1024/1440px).
**Target Platform**: Web — server-rendered/RSC by default in evergreen browsers, responsive from 375px to 1440px+.
**Project Type**: Single existing Next.js app (no new project/package) — this feature adds route stubs, shared shell components, and one content file inside the current `src/` tree.
**Performance Goals**: No dedicated perf budget beyond Principle VIII's fidelity bar; header/footer must not introduce layout shift, and all motion must respect `prefers-reduced-motion` (per `docs/architecture.md`).
**Constraints**: Every design value must resolve to a named token from `research/design-tokens.md` — no raw colors/spacing/type values in component code (Constitution V); Server Components by default, `"use client"` only on the smallest interactive piece (the desktop nav's active-state/dropdown logic and the mobile menu); no new frameworks/libraries (Constitution II).
**Scale/Scope**: 9 public route stubs (`/`, `/about`, `/campuses`, `/academics`, `/admission`, `/resources`, `/news`, `/news/[slug]`, `/contact`) + a global not-found page, sharing one header/top-bar/footer/skip-link component set and one content file.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Purpose & Fidelity | PASS | Values sourced exclusively from `research/design-tokens.md` per user instruction; layout fidelity checked against `screenshots/das.edu.pk_*` per viewport (per spec Assumptions, dedicated header/footer crops don't exist yet). Documented deviations (no Franchise Offer, Metroville-only content) are already in spec.md — no silent scope change. |
| II. Fixed Stack | PASS | Uses only already-installed dependencies (Tailwind v4, shadcn/ui, `@base-ui/react`, `motion`, `lucide-react`). No new package, no version bump. |
| III. Security | N/A | This feature has no auth, no admin routes, and no data-writing form (the Contact page's actual form is a separate feature) — nothing in scope touches Principle III. |
| IV. Data Integrity | N/A | No persisted records; content is static and typed, not stored/mutated at runtime. |
| V. Design System | PASS (drives the plan) | `src/app/globals.css` currently only has the generic shadcn placeholder theme — Phase 1 design work adds every token in `research/design-tokens.md`'s "Suggested token names" list to `@theme`, plus custom breakpoints, so components never use raw values. |
| VI. Components | PASS | One component per visual section (`TopBar`, `Header`, `NavDesktop`, `NavMobile`, `Footer`, `SkipLink`, `PagePlaceholder`); pages only compose them; Server Components by default; copy lives in `src/content/site-shell.ts`, not components. |
| VII. Extensibility | PASS (N/A-leaning) | No API/data model is introduced by this feature, so there's nothing to over- or under-design for a future chatbot consumer; the content file is plain, portable TypeScript, not coupled to rendering, which costs nothing extra now. |
| VIII. Testing & DoD | PASS (planned) | One e2e test per user story (6) plus token/screenshot fidelity checks at all four breakpoints, per Phase 1 test plan below. |

No violations — Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-site-shell/
├── plan.md                        # This file (/sp.plan command output)
├── research.md                    # Phase 0 output (/sp.plan command)
├── data-model.md                  # Phase 1 output (/sp.plan command)
├── quickstart.md                  # Phase 1 output (/sp.plan command)
├── contracts/
│   └── content-schema.md          # Phase 1 output — typed content-file contract (no HTTP API; see research.md §3)
├── checklists/
│   └── requirements.md            # already produced by /sp.specify
└── tasks.md                       # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                # root layout: SkipLink + Header (TopBar+Nav) + {children} + Footer
│   ├── globals.css                # extended @theme: design tokens + custom breakpoints from research/design-tokens.md
│   ├── not-found.tsx              # global "page not found", renders inside the shell via root layout
│   ├── page.tsx                   # / — Home (placeholder; real Home sections are a later feature)
│   ├── about/page.tsx             # placeholder
│   ├── campuses/page.tsx          # placeholder
│   ├── academics/page.tsx         # placeholder
│   ├── admission/page.tsx         # placeholder
│   ├── resources/page.tsx         # placeholder
│   ├── news/page.tsx              # placeholder
│   ├── news/[slug]/page.tsx       # placeholder (no real slugs until feature 003-news)
│   └── contact/page.tsx           # placeholder
├── components/
│   ├── ui/
│   │   └── button.tsx             # existing shadcn button (reused, e.g. mobile menu close control)
│   └── site-shell/
│       ├── skip-link.tsx          # server — "skip to content" link, first focusable element
│       ├── top-bar.tsx            # server — phone/email/address + social icons, reads content file
│       ├── header.tsx             # server wrapper — composes Logo, TopBar, NavDesktop, NavMobile
│       ├── logo.tsx                # server — renders public/images/logo.svg, alt
│       │                           #   "Dar-e-Arqam School Metroville Campus", links to
│       │                           #   "/", sized to match screenshots/design-tokens.md
│       │                           #   per viewport (no placeholder)
│       ├── nav-desktop.tsx        # "use client" — active-item (usePathname) + hover/focus dropdowns
│       ├── nav-mobile.tsx         # "use client" — open/close, expand/collapse sub-pages, focus trap, scroll lock, Escape
│       ├── footer.tsx             # server — columns, quick links, bottom bar with render-time copyright year
│       └── page-placeholder.tsx   # server — shared "not built yet" content for stub routes
└── content/
    └── site-shell.ts              # single typed source: NavigationItem[], ContactInfo, FooterContent

# Vitest (colocated *.test.ts[x])
src/content/site-shell.test.ts
src/components/site-shell/*.test.tsx

# Playwright (one spec per user story)
e2e/
├── desktop-navigation.spec.ts     # US1
├── mobile-navigation.spec.ts      # US2
├── contact-and-social.spec.ts     # US3
├── footer.spec.ts                 # US4
├── header-scroll.spec.ts          # US5
└── shell-and-placeholders.spec.ts # US6
# e2e/home.spec.ts is updated in this feature: the default create-next-app
# scaffold text it asserts on is removed once Home renders inside the shell.
```

**Structure Decision**: Single existing Next.js app (Option 1 shape, already
established by the initial commit) — no new project or package. This
feature adds one `site-shell` component group under `src/components/`, one
content file under `src/content/`, and one route stub per PRD sitemap entry
under `src/app/`, plus a global `not-found.tsx`. Nothing outside `src/`,
`e2e/`, and this feature's `specs/001-site-shell/` docs is touched.

## Post-Design Constitution Check

*Re-evaluated after Phase 1 (research.md, data-model.md, contracts/,
quickstart.md).* No new violations were introduced by the design: the
content-file contract, component split, and token-extension approach match
every PASS/N/A row from the pre-design table above unchanged.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Not applicable — no Constitution Check violations were found before or
after Phase 1 design.

# Phase 0 Research: Site Shell

All Technical Context fields in `plan.md` were resolvable from existing
project artifacts (`docs/architecture.md`, `.specify/memory/constitution.md`,
`research/design-tokens.md`, `docs/prd.md`, and the current `src/` tree) — no
`NEEDS CLARIFICATION` markers remain. This document records the decisions
that weren't a direct lift from those sources, since they involved a choice
among alternatives.

## 1. Mobile-menu collapse breakpoint

- **Decision**: Define a custom Tailwind breakpoint at `1024px` used as a
  `min-width` gate — the full desktop menu renders at `>= 1024px`, the
  mobile menu button renders at `< 1024px`.
- **Rationale**: `research/design-tokens.md`'s own measured DOM capture is
  unambiguous even though the raw stylesheet media-query list is not: main
  menu items are present in the DOM at 1440px and 1024px, and absent at
  768px and 375px. A `min-width: 1024px` gate reproduces exactly that
  observed behavior. The source theme implements this with a `max-width`
  rule instead, but translating it to an equivalent `min-width` Tailwind
  breakpoint changes nothing observable and fits this project's Tailwind v4
  token conventions.
- **Alternatives considered**:
  - Literal `max-width: 1024px` (hide menu at and below 1024px) — rejected,
    it would hide the menu exactly at 1024px, contradicting the measured
    capture where the menu is present at 1024px.
  - `768px` threshold — rejected, contradicted by the measured absence of
    the menu at 768px.
- Confirms spec.md's Assumption: "the reference site's collapse breakpoint
  ... is the breakpoint recorded for das.edu.pk in research/design-tokens.md."

## 2. Single typed content file

- **Decision**: One file, `src/content/site-shell.ts`, exports
  `navigationItems: NavigationItem[]`, `contactInfo: ContactInfo`, and
  `footerContent: FooterContent`.
- **Rationale**: The user's brief for this plan explicitly requires "one
  typed content file" for menu items, contact details, and social links.
  `docs/architecture.md`'s `src/content/<page>.ts` convention is for
  per-page copy; the shell isn't a page but the convention (typed, static,
  outside components) still applies directly. Keeping all three shell
  entities in one file also matches FR-013 (contact/social) and the shared
  read by both TopBar and Footer, plus FR-004 (nav dropdown driven by data).
- **Alternatives considered**: separate `navigation.ts` / `contact.ts` /
  `footer.ts` files — rejected as directly contrary to the explicit
  "one file" instruction, and unnecessary given the small size of each
  entity.

## 3. No API contracts

- **Decision**: This feature introduces no route handlers under
  `/api/public/*`, `/api/admin/*`, or elsewhere.
- **Rationale**: Every functional requirement (FR-001–FR-024) is served by
  static content and client-side interaction (dropdowns, mobile menu,
  scroll behavior). The only data-writing feature mentioned nearby — the
  Contact page's actual submission form — is explicitly out of scope here
  (spec.md "Out of Scope"). Phase 1's "contracts" output is therefore a
  documented TypeScript data contract (the content file's exported shape),
  not an OpenAPI/GraphQL schema.
- **Alternatives considered**: none — no user action in this feature's FRs
  requires server mutation or a fetched dynamic resource.

## 4. Placeholder route mechanism

- **Decision**: One reusable server component, `PagePlaceholder`, rendered
  by every not-yet-built route's `page.tsx`.
- **Rationale**: FR-017 requires uniform "renders inside the shell, shows
  placeholder content" behavior across 8 stub routes; Constitution VI
  prohibits duplicating section-level markup across pages. A single
  component keeps that behavior consistent and lets a later feature swap in
  a real page by simply replacing that route's `page.tsx`.
- **Alternatives considered**: inline duplicate JSX per route — rejected,
  duplicates markup and risks drift between placeholders.

## 5. Mobile menu focus containment

- **Decision**: Build the mobile menu's focus trap and open/close state
  using `@base-ui/react` (already a fixed-stack dependency, already used for
  `Button`), rather than a hand-rolled trap.
- **Rationale**: Constitution II forbids new dependencies; `@base-ui/react`
  is already installed and designed for exactly this kind of accessible
  overlay primitive. Reusing it avoids reimplementing focus-trap/Escape/
  scroll-lock semantics that a maintained primitive already gets right.
- **Alternatives considered**: a fully custom trap using plain refs and
  manual `keydown` handling — kept as the fallback approach only if
  `@base-ui/react` has no suitable primitive for a non-modal-dialog-shaped
  slide-out menu; still zero new dependencies either way.

## 6. Active-page detection

- **Decision**: `NavDesktop` (and `NavMobile`) are small `"use client"`
  components that call `usePathname()` to compare against each
  `NavigationItem.href` for the active/current marker (FR-002) and
  `aria-current`.
- **Rationale**: Keeps route-awareness local to the nav components
  themselves; per Constitution VI, pages only compose components and don't
  need to know about nav internals, so no per-page prop-drilling of the
  current route is needed.
- **Alternatives considered**: passing the active route down from each
  `page.tsx` via a layout prop — rejected, adds boilerplate to every route
  for no benefit `usePathname()` doesn't already give for free.

## 7. Desktop dropdown interaction

- **Decision**: Desktop dropdown open/close (FR-003) is primarily CSS-driven
  (`:hover`, `:focus-within` on the menu-item container), with the
  surrounding `NavDesktop` client component only adding the minimal JS
  needed for `aria-expanded` state and the precise "closes once neither
  pointer nor focus remains" condition.
- **Rationale**: Matches `docs/architecture.md`'s "`use client` only on the
  smallest interactive piece" — most of the interaction is expressible
  declaratively, and only the accessibility state needs script.
- **Alternatives considered**: fully JS-driven open/close (mouseenter/
  mouseleave/focus listeners for all show/hide logic) — rejected as more
  client JS than the interaction requires.

## 8. Placeholder contact values

- **Decision**: `contactInfo` in `src/content/site-shell.ts` ships with
  clearly-marked placeholder values (e.g. a TBD phone/email/address) until
  the client supplies real Metroville details.
- **Rationale**: spec.md's Assumptions already establish this — real values
  are PRD-open (§5.3, Open Question 8) — and `docs/architecture.md` states
  "Copy not yet supplied by the client uses marked placeholders in
  `src/content/`." Swapping in real values later is a content edit only
  (FR-013's guarantee), not a code change.
- **Alternatives considered**: leaving fields empty — rejected, FR-012's
  "omit when no configured value" rule is for optional social links, not
  for the required phone/email/address fields, which must render something
  to satisfy FR-010/FR-011 and be testable.

**Output**: All NEEDS CLARIFICATION resolved; no open questions block Phase 1.

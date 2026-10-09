# ADR-0002: Admin Notifications — Client-Polled Live State, a Shared Popover Primitive, and Last-Opened Defaults to Now

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted
- **Date:** 2026-09-26
- **Feature:** 009-admin-notifications
- **Context:** The admin panel needs a bell and matching sidebar badges for new messages (008) and new signups (004) that stay current "while the admin is logged in" (spec P2) without a page reload, and without violating Constitution II's fixed stack (no new frameworks/dependencies) or Out of Scope's explicit ban on server-pushed live updates. Three decisions in this feature are entangled and set precedent beyond this feature alone: (1) how "live" client data is kept fresh in an app whose stack has no data-fetching library; (2) what overlay primitive backs a dropdown-style panel, since none existed in `src/components/ui` before this feature; (3) how a brand-new, feature-defining "new since X" threshold behaves the first time it is ever evaluated for an admin who has pre-existing data. Each choice constrains how the *next* live-indicator or dropdown-panel feature gets built, which is why they are recorded together rather than left implicit in `research.md`.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

- **Live-data pattern: client-side interval polling, no data-fetching library.** A single React Context (`NotificationsProvider`) is seeded once from a server-computed value (SSR, flash-free first paint) and then keeps itself fresh with: a plain `fetch` on a ~60-second `setInterval`; the interval cleared while `document.visibilityState === "hidden"` and re-armed (with an immediate fetch) on `"visible"`; and an explicit `refreshNow()` that mutation call sites invoke right after their own request succeeds, so in-tab changes reflect immediately instead of waiting for the timer. A failed fetch leaves the previous state untouched and surfaces no error. This is now the reference pattern for "keep an admin indicator live" in this codebase — the next feature that needs one reuses this shape rather than inventing another.
- **Shared overlay primitive: `src/components/ui/popover.tsx`, wrapping `@base-ui/react/popover`.** The first Popover component in the design system, added the same way `dialog.tsx` already wraps `@base-ui/react/dialog` (Root/Trigger/Portal/Positioner/Popup/Backdrop, project motion/token classes). One implementation serves both the bounded desktop dropdown and the full-width phone layout via responsive width classes on the same `Popup` — not two different overlay components switched by viewport.
- **"New since X" bootstrapping: default to now, not the epoch, on first evaluation.** Any per-admin "since last opened/seen" threshold introduced by this feature (`adminNotificationStates.signupsLastOpenedAt`) is lazily created, on its first read for a given admin, with the threshold set to the current moment — never a zero/epoch date. Consequently, nothing that already existed before the admin's first interaction with the feature is ever retroactively "new."

## Consequences

### Positive

- **One polling mechanism, one place it can break.** Every future "live admin indicator" need reuses `NotificationsProvider`'s shape (or the provider itself, if its data shape extends), instead of each feature re-deriving its own interval/visibility logic — the exact duplication Constitution VI exists to prevent.
- **No dependency added.** `fetch` + `document.visibilityState` are platform APIs; `@base-ui/react/popover` ships in a dependency already in the fixed stack. Constitution II stays satisfied without a governance amendment.
- **The Popover wrapper is immediately reusable.** Any future dropdown/menu-adjacent UI (a user menu, a filter flyout) has a ready-made, accessible (focus trap, Escape, outside-click, ARIA — inherited from Base UI) primitive instead of a bespoke one.
- **No false-positive flood on launch.** Defaulting to "now" means the day this feature ships, an admin with hundreds of pre-existing signups sees zero false "new" badges; only genuinely new arrivals light up the indicator, which is what "new" is supposed to mean to the person reading it.
- **The "now" default composes correctly with the spec's own edge case.** A signup updated by a repeat submission after that moment still correctly becomes new again — the default only affects the very first evaluation, never subsequent ones.

### Negative

- **Client polling is not truly real-time.** Cross-session changes can take up to ~60 seconds to appear (accepted explicitly — Out of Scope rules out push transports); a feature that later needs sub-second freshness cannot reuse this pattern as-is and would need its own ADR to introduce one (e.g. SSE/WebSocket), which is a bigger, dependency-affecting decision.
- **State lives in a React Context above the routed pages**, so any consumer must render inside `AdminShell`; a page or route rendered outside that shell (none exist today besides the login page, by design) cannot read live counts without its own fetch.
- **The Popover's responsive-width approach couples "mobile full-width" to one component's CSS.** If a future consumer of `popover.tsx` needs genuinely different mobile behaviour (e.g. a bottom sheet, not just a wider box), that consumer either fits this shape or the primitive needs a documented variant — not a silent one-off override.
- **"Default to now" means an admin's very first notifications fetch after this feature ships is a hidden write** (the lazy-create). This is a small, one-time side effect on what looks like a read; it must stay documented here so nobody later "simplifies" `getSignupsLastOpenedAt` into a pure read and reintroduces the epoch-default flood.
- **The threshold is per-admin, not global**, even though exactly one admin account exists today (002's `user` collection invariant) — a deliberate small amount of unused generality (Constitution VII: "don't paint into a corner"), not zero-cost: it is one more field (`adminId`) and one more index key to reason about than a single global row would need.

## Alternatives Considered

**Live-data pattern:**

- **A. Add a data-fetching library (SWR / TanStack Query) for polling + cache.** Rejected: Constitution II forbids a new dependency without amending the constitution first; also unnecessary — this feature has exactly one polled endpoint and no cross-route cache-sharing need that would justify the library's actual value proposition.
- **B. Server-Sent Events or a WebSocket channel pushed from the server.** Rejected outright by the spec's Out of Scope ("Live updates pushed from the server... a timer is enough") and would need a persistent-connection story this Next.js deployment doesn't otherwise have.
- **C. Rely solely on `router.refresh()` (008's existing pattern for the messages badge) with no client polling at all.** Rejected as insufficient on its own: `router.refresh()` only re-runs Server Components on *this tab's* navigation/action — it does nothing for a change that happened in another session while this admin sits idle, which is exactly the P2 "updates without reloading" requirement. (It is still used, alongside polling, for each page's own non-notification data.)
- **D. Each consumer (sidebar, bell) polls independently.** Rejected: duplicate requests, duplicate timers, and no structural guarantee the two ever agree — the risk the spec's "sidebar and bell always agree" requirement exists to rule out.

**Overlay primitive:**

- **E. `@base-ui/react/menu` instead of `popover`.** Rejected: Menu's semantics (roving tabindex, selection-oriented Escape/Enter handling, typeahead) fit a command list, not a mixed feed of navigable items plus a distinct bulk action and an empty state; `popover` is the closer semantic match, and is also the more broadly reusable primitive to add to the design system first.
- **F. A separate `Dialog`-based full-screen component for phone width, kept apart from a desktop `Popover`.** Rejected: doubles the surface needing open/close/focus/Escape testing for a difference that is purely a CSS width; also would give the design system two competing "how do I make a dropdown" answers instead of one.

**Last-opened bootstrapping:**

- **G. Default a never-opened admin's threshold to the epoch (`new Date(0)`).** Rejected: the literal reading of "since last opened" — but produces a wall of false "new" badges for every pre-existing signup the first time anyone opens the bell after this feature ships, undermining the feature's own purpose (surfacing genuinely new arrivals) on day one.
- **H. A one-time data migration that back-fills `signupsLastOpenedAt = now` for the (single) existing admin at deploy time.** Rejected in favour of lazy creation-on-first-read: a migration step is one more deployment artifact to remember and re-run correctly in every environment (including a fresh `npm run dev` / test database), for a result the lazy default achieves automatically and correctly in every environment, including ones that don't run migrations at all (e.g. Playwright's per-suite database).
- **I. Per-signup "seen" flags instead of one per-admin timestamp.** Rejected: the spec's rule is explicitly time-based; a flag per record needs a write per signup instead of one write per admin action, and loses the "repeat submission counts as new again" behaviour for free that a timestamp comparison already gives.

## References

- Feature Spec: [specs/009-admin-notifications/spec.md](../../specs/009-admin-notifications/spec.md) — FR-016–FR-022, User Stories 3 and 4, Assumptions
- Implementation Plan: [specs/009-admin-notifications/plan.md](../../specs/009-admin-notifications/plan.md) — Constitution Check (II, VI), post-design re-check
- Research: [specs/009-admin-notifications/research.md](../../specs/009-admin-notifications/research.md) §1 (last-opened default), §3 (live updates), §4 (Popover primitive), §10 (no new dependencies)
- Data Model: [specs/009-admin-notifications/data-model.md](../../specs/009-admin-notifications/data-model.md) — `AdminNotificationState`, state transitions
- Contracts: [specs/009-admin-notifications/contracts/admin-notifications-api.md](../../specs/009-admin-notifications/contracts/admin-notifications-api.md), [specs/009-admin-notifications/contracts/notification-ui.md](../../specs/009-admin-notifications/contracts/notification-ui.md)
- Foundation: `src/components/ui/dialog.tsx` (the wrapping pattern this ADR's Popover follows), `src/app/admin/(dashboard)/layout.tsx` and 008's `MarkReadOnOpen` (the existing `router.refresh()`-after-mutation precedent this ADR builds alongside, not instead of)
- Constitution: `.specify/memory/constitution.md` II. Fixed Stack, VI. Components, VII. Extensibility
- Related ADRs: [0001-signup-upsert-and-restore.md](0001-signup-upsert-and-restore.md) (no direct conflict — that ADR governs how a signup *record* is written; this one governs how its *notification threshold* is read, a different collection and a different question)
- Evaluator Evidence: [history/prompts/009-admin-notifications/0002-plan-admin-notifications-feature.plan.prompt.md](../prompts/009-admin-notifications/0002-plan-admin-notifications-feature.plan.prompt.md)

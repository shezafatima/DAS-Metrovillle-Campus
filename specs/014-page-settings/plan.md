# Implementation Plan: Settings by Page (014, slice 1 — structure only)

**Branch**: `014-page-settings` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/014-page-settings/spec.md`

## Summary

Turn admin Settings into one tab per public page: Site-wide, Home, Admission and Resources (About, Academics and Careers stay hidden until later slices give them panels). Each tab is its own route and permission check. Its panels are the existing 005 groups (and the 007 album list) in public page order, each collapsible, with a "View on site" link. The admission group is split into three panels with different permissions (window and classes under Settings, messages under Pages). Each saves only its own fields, guarded by a **per-panel fingerprint** and still written by the group's existing version compare-and-set (research R4). Two save actions replace `saveSettingsGroup`, one per permission, so the access inventory can prove each panel's permission (R5). Hero, video, stats, admission messages, the gallery and the upload signer move from Settings to Pages. A one-time, idempotent grant gives Pages to every content manager who holds Settings, run before the deploy (R14). Old URLs redirect from `next.config.ts` (R7). No stored settings record is reshaped.

## Technical Context

**Language/Version**: TypeScript (strict), Node per `.nvmrc`
**Primary Dependencies**: Next.js 16.3.5 (App Router), React, Tailwind v4, shadcn/ui primitives, Zod, Mongoose, Better Auth (all existing; nothing new)
**Storage**: MongoDB Atlas: `settings` (additive optional `panelSaves`), `user.permissions` (one-time grant), `userChanges` (existing type)
**Testing**: Vitest (unit, actions, access inventory), Playwright + axe (E2E)
**Target Platform**: Vercel (server), modern browsers; admin at 320–1440 px
**Project Type**: Single Next.js web app (`src/`)
**Performance Goals**: Tab pages read each group once (Admission: one read feeds three panels); a panel save is one read and one conditional write (≤ 3 attempts under contention)
**Constraints**: No data migration of settings; no new dependency; no experimental Next flags; server-side checks on every page, action and route; one unsaved-changes prompt per tab
**Scale/Scope**: 4 visible tabs, 8 panels, 6 old URLs redirected, ~2–5 admin accounts

No NEEDS CLARIFICATION remains (spec Q1–Q3 answered; research R1–R15).

## Constitution Check

*Gate before Phase 0 and re-checked after Phase 1.*

| Principle | Check | Status |
|---|---|---|
| I. Purpose & Fidelity | Admin-only reorganisation; the only public change is three fragment ids (no visual change). Scope from the 014 brief. | PASS |
| II. Fixed Stack | No new framework, service or major upgrade. `forbidden()` (experimental) deliberately not used (R6). | PASS |
| III. Roles & Access | Every tab page, both save actions, gallery actions and the signer check on the server with literal access values (R2, R5). Hidden tabs are presentation only. The Pages grant is recorded in the 011 change record with who (system) and when (R14). Registrations and Users untouched. | PASS |
| IV. Security | Grant is a manual script, never in build or startup. No secrets. Origin check on Server Actions unchanged. | PASS |
| V. Personal Data | No personal data touched. | N/A |
| VI. Data Integrity | Same Zod definitions client and server (`panelDefinition`). Writes stay one conditional update (compare-and-set); no field outside a panel can be written (R4). Soft-deleted list items preserved by the existing reconcile. | PASS |
| VII. Design System | Tab bar and panel header reuse existing tokens/classes (`anchor-section`, sidebar/top-bar tokens). Any new value (e.g. sticky offset = top bar height) MUST come from an existing token. | PASS (verify in review) |
| VIII. Content | Fixed layout: panels map to fixed sections; nothing adds or reorders sections. Saves revalidate the public site. New admin copy in `src/content/admin.ts`. | PASS |
| IX. Components | Tab bar, panel and provider are single shared components; pages compose them. Server Components by default; client only for the panel toggle, forms and guard. | PASS |
| X. Extensibility | Panels are a registry over groups, so slices 2–3 add panels without changing the mechanism; no speculative generality (`settings_or_pages` rather than an access algebra). | PASS |
| XI. Testing & DoD | Three access cases for every new or changed entry point; E2E per user story; axe per tab; widths 375/768/1024/1440 plus 320 for the bar. | PASS (planned) |

**Post-design re-check**: still PASS. The design adds no violation; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/014-page-settings/
├── spec.md
├── plan.md               # this file
├── research.md           # R1–R15
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── panel-actions.md
│   ├── access-matrix.md
│   └── tabs-and-panels.md
├── checklists/requirements.md
└── tasks.md              # /sp.tasks (not created here)
```

### Source Code

```text
src/
├── lib/
│   ├── permissions.ts                    # + "settings_or_pages" in Access / canAccess
│   ├── log.ts                            # settings_saved: + panel
│   ├── settings/
│   │   ├── panels.ts                     # NEW: tabs, panels, panelDefinition, visibleTabs (pure)
│   │   ├── panels.test.ts                # NEW: registry invariants
│   │   ├── fingerprint.ts(+test)         # NEW: canonical JSON → SHA-256 (server only)
│   │   ├── mutations.ts                  # + savePanel (R4); saveGroup kept as internal helper or folded in
│   │   ├── admin.ts                      # + getAdminPanels(group, panelKeys) → data, fingerprint, lastSaved per panel
│   │   └── types.ts                      # + SavePanelResult; ImageFieldDef unchanged
│   └── users/
│       └── grant-pages.ts(+test)         # NEW: idempotent one-time grant (R14)
├── models/settings.ts                    # + optional panelSaves (Mixed)
├── content/admin.ts                      # tab labels, panel titles, read-only lines, page titles; nav item access
├── app/admin/(dashboard)/settings/
│   ├── layout.tsx                        # computes visible tabs → tab bar
│   ├── page.tsx                          # settings_or_pages → first visible tab
│   ├── actions.ts(+test)                 # saveSettingsPanel, savePagesPanel (saveSettingsGroup removed)
│   ├── site-wide/page.tsx                # NEW (settings)
│   ├── home/page.tsx                     # NEW (pages)
│   ├── admission/page.tsx                # settings_or_pages, three panels
│   ├── resources/page.tsx                # NEW (pages): album list panel
│   ├── resources/gallery/[albumId]/page.tsx   # MOVED (pages)
│   ├── resources/gallery/actions.ts(+test)    # MOVED (pages)
│   └── (contact|hero|stats|video|gallery)/    # DELETED
├── app/api/admin/settings/uploads/sign/route.ts  # access → pages
├── components/admin/settings/
│   ├── settings-nav.tsx                  # → tab bar (one scrolling row, aria-current)
│   ├── settings-panel.tsx                # NEW: section, sticky header, toggle, View on site, hash open
│   ├── unsaved-panels.tsx                # NEW: provider + useReportUnsaved
│   ├── settings-group-form.tsx           # → panel form: panelDefinition, fingerprint, action by saveAccess, readOnly
│   └── settings-group-view.tsx           # replaced by settings-panel (status/warning props kept)
├── components/admin/gallery/*            # href/revalidate paths → /admin/settings/resources…
├── components/home/{hero-slider,inspiration-why-choose,progress-dashboard}.tsx  # + fragment ids
└── test/access-inventory.test.ts         # EXPECTED rows per contracts/access-matrix.md
next.config.ts                            # + 6 admin redirects
scripts/grant-pages.ts                    # NEW; package.json "grant:pages"
e2e/
├── admin-settings-tabs.spec.ts           # NEW: US1, US5, axe
├── admin-settings-tab-access.spec.ts     # NEW: US2
├── admin-settings-redirects.spec.ts      # NEW: US3
├── admin-settings-panels.spec.ts         # NEW: US4
├── helpers/settings.ts, helpers/gallery.ts   # new URLs
└── admin-settings-*.spec.ts, admin-gallery-*.spec.ts, admin-roles-access-matrix.spec.ts  # URL updates + rows
docs/architecture.md                      # Settings section: tabs, panels, permissions
```

**Structure Decision**: Existing single Next.js app. The panel registry sits beside the 005 group registry in `src/lib/settings`; tabs are static route folders (R1).

## Key Design Points

1. **Panel save (R4)** — the heart of the slice. Fingerprint on the panel's fields, conditional write on the group version, bounded retry. Contract: `contracts/panel-actions.md`. Recorded in [ADR-0013](../../history/adr/0013-settings-panels-partial-save-and-permissions.md) (Proposed).
2. **Two actions by permission (R5)** — keeps every save's permission a literal checked by the inventory; closes the old Settings path to Home content.
3. **Access value `settings_or_pages` (R2)** — Admission tab, Settings index and sidebar item.
4. **Read-only panels (R11)** — `<fieldset disabled>`; the server refuses regardless.
5. **One guard per tab (R8)** and **sticky panel header (R9)**.
6. **Grant before deploy (R14)** — idempotent conditional update; change-record entries only for real changes.

## Risks

- **E2E churn**: many settings and gallery specs use old URLs; the redirects keep most passing, but assertions on `toHaveURL` need edits. Diff failure sets against the known admin baseline.
- **Forgotten grant**: if the deploy goes out without `grant:pages`, Settings-only content managers lose Home/Resources editing until it runs (the main admin can also grant by hand). Mitigation: quickstart release order; the script is safe to run any time.
- **Sticky header offset** must match the admin top bar height token, or headers hide under it.

## Complexity Tracking

None.

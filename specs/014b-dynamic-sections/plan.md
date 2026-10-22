# Implementation Plan: Dynamic Sections (014b — Syllabi, Examination, Class Levels, Portal Links)

**Branch**: `014b-dynamic-sections` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/014b-dynamic-sections/spec.md`

## Summary

Four public parts become admin-managed: Syllabi and Examination (Academics tab, Pages), Class Levels (Admission tab, Pages) and the footer's Portal Links (Site-wide tab, Settings). Each is a **new 005 Settings group edited by one 014 panel**, so it inherits slice 1's fingerprint + compare-and-set save, unsaved marker, read-only mode, audit line and revalidation unchanged (research R1).

**Engine additions** (R2): small, generic and opt-in:
- a `lines` field (topics, one per line);
- a `dayMonth` field (the age reference date);
- URL options for credentials, the not-secure warning and a Test link;
- a whole-group topic cap (3,000) that keeps the syllabus inside one document (R4).

**Custom editors**: the Syllabi editor and the classes checklist plug into the existing panel form through an `editor` slot (R15).

**Registration**: the admission `classes` items gain a `levelId`, so "Classes open for admission" becomes a checklist of Class Levels. Existing typed names read as "not linked" and stay offered, so the deploy changes nothing for parents until the optional migration links them (R5, R6). A server cross-check refuses a checklist save that names a deleted level (R7).

**Public site**:
- The sections are added to `pageSections`, and one resolver hides them (and their menu and search entries) while empty (R11).
- Syllabi uses ARIA tabs with per-level links (R12).
- The footer reads Portal Links from Settings, and `/portal/*` redirects to `/` (R14).

**Scripts**: two manual scripts, a seeder (dry run, `--confirm`, never overwrites, marks content pending) and the class-link migration (R9, R6). The pending notice is cleared by two new logged confirm actions (R8).

## Technical Context

**Language/Version**: TypeScript (strict), Node per `.nvmrc`
**Primary Dependencies**: Next.js 16.3.5 (App Router), React, Tailwind v4, shadcn/ui + Base UI primitives, lucide-react, Zod, Mongoose, Better Auth (all existing; nothing new)
**Storage**: MongoDB Atlas. New `settingsChanges` collection (one entry per save that removes items, research R3). `settings` gains 4 documents (`syllabi`, `examination`, `classLevels`, `portalLinks`) and an optional `pendingConfirmation` field. The `admission.classes` items gain an optional `levelId`
**Testing**: Vitest (unit, actions, access inventory), Playwright + axe (E2E)
**Target Platform**: Vercel (server), modern browsers; public pages at 375–1440 px, admin at 320–1440 px
**Project Type**: Single Next.js web app (`src/`)
**Performance Goals**: The Syllabi editor stays responsive with the full reference content (~500 topics): opening a level, typing and saving feel instant (SC-002: save round-trip < 1 s, no long task > 200 ms while typing). The public pages add at most 3 cached Settings reads (header) plus 1 (footer)
**Constraints**: No new dependency; no experimental flags; server-side permission checks on every page and action; one stored document per section (≤ 16 MB, so a 3,000-topic cap); plain text only; scripts manual only
**Scale/Scope**: 4 new panels in 3 tabs (Academics newly visible); 3 public sections + 1 footer column; ~2–5 admin accounts; syllabus ~11 levels / ~500 topics (cap 3,000)

No NEEDS CLARIFICATION remains: spec Clarifications Q1–Q6 are answered (Q5 and Q6 came during planning, after comparing the reference screenshots and page), and research covers R1–R17.

## Constitution Check

*Gate before Phase 0 and re-checked after Phase 1.*

| Principle | Check | Status |
|---|---|---|
| I. Purpose & Fidelity | Sections restore reference content (das.edu.pk Syllabi, Examinations, Class Levels, top-bar portal links). Deviations are recorded in the spec ("Deviations from the reference"): Examination as cards (user-approved 2026-10-19), the phone level picker (brief), and the "Syllabi" h2. The conflict between the reference and the brief's bullets-only shape was flagged and resolved by the user (spec Q5), not guessed. Scope comes from the 014b brief | PASS |
| II. Fixed Stack | No new framework, service or major upgrade. Cloudinary is not touched | PASS |
| III. Roles & Access | Each panel is saved by the action matching its permission (Pages: syllabi, examination, class-levels; Settings: portal-links, admission-classes), checked on the server with a literal. The new Academics page uses `requireAdminPage("pages")`. Confirm actions are split by permission. Read-only panels are presentation only, and the server refuses regardless. Registrations and Users are untouched | PASS |
| IV. Security | Scripts are manual only and print the host, never the connection string. URLs are restricted to http/https with a host and no credentials, and footer links use `noopener noreferrer`. No HTML is rendered from content (React escaping, no `dangerouslySetInnerHTML`) | PASS |
| V. Personal Data | Registrations keep their stored class text; nothing reads or rewrites them. No new personal data | PASS |
| VI. Data Integrity | One Zod schema per group from its definition, shared by client and server. Every write is one compare-and-set; the checklist cross-check refuses references to missing levels. No permanent delete: top-level items removed by a save keep a `deletedAt` marker in the record, and every removed item at any depth is recorded with its previous value in `settingsChanges`, so it can be re-entered (R3, spec FR-007). Uniqueness: class level names; one link per level in the checklist (`uniqueText`, R5) | PASS |
| VII. Design System | New sections reuse existing section, card, table and footer tokens and classes. Any missing value (e.g. tab active colour from the reference) is added to `research/design-tokens.md` before use | PASS (verify in review) |
| VIII. Content | Section placement on each page stays fixed in code (`pageSections`). Admins edit the items inside a section (as with hero slides and albums), never which sections exist or their order. Hiding an empty section follows the 007/017 precedent. Saves revalidate. New copy goes in `src/content/admin.ts` and the content files | PASS |
| IX. Components | One component per public section (`SyllabiSection`, `ExaminationSection`, `ClassLevelsSection`). Server Components by default; client islands only for the tabs and hash and for the editors. Shared engine controls are reused | PASS |
| X. Extensibility | Data is stored in the brief's shapes (arrays of typed items, `topics: string[]`), readable by a future chatbot through the same group definitions. No speculative generality: `editor` has exactly two values, and cross-checks are keyed by panel | PASS |
| XI. Testing & DoD | Three access cases for the new page and every changed or new action. E2E per user story. axe on the 4 panels and 3 public pages. Checks at 375/768/1024/1440 plus the reference's own 640 px breakpoint (`research/design-tokens.md`); no horizontal scroll and no overlapping boxes. 013's tests updated | PASS (planned) |

**Post-design re-check**: still PASS. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/014b-dynamic-sections/
├── spec.md
├── plan.md               # this file
├── research.md           # R1–R17
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── panel-actions.md
│   ├── access-matrix.md
│   ├── public-sections.md
│   └── scripts.md
├── checklists/requirements.md
└── tasks.md              # /sp.tasks (not created here)
```

### Source Code

```text
src/
├── lib/
│   ├── log.ts                                   # + settings_confirmed, settings_seeded, classes_linked
│   ├── settings/
│   │   ├── types.ts                             # + LinesField, DayMonthField, UrlField options, maxTotalLines rule,
│   │   │                                        #   ListField.maxDeletedRetained; GROUP_KEYS + 4 keys
│   │   ├── schema.ts(+test)                     # lines, dayMonth, URL options, maxTotalLines
│   │   ├── items.ts(+test)                      # per-list maxDeletedRetained
│   │   ├── groups/syllabi.ts                    # NEW
│   │   ├── groups/examination.ts                # NEW
│   │   ├── groups/class-levels.ts               # NEW
│   │   ├── groups/portal-links.ts               # NEW
│   │   ├── groups/admission.ts                  # classes items + levelId, name 60, uniqueText(levelId)
│   │   ├── registry.ts                          # + 4 groups
│   │   ├── panels.ts(+test)                     # + 4 panels, editor slot, tabs (academics, admission, site-wide)
│   │   ├── panel-checks.ts(+test)               # NEW: admission-classes cross-check (server only)
│   │   ├── removed-items.ts(+test)              # NEW: removed items by id, at any depth (pure)
│   │   ├── mutations.ts(+test)                  # run panel checks; write change record; never touch pendingConfirmation
│   │   ├── confirm.ts(+test)                    # NEW: clear pendingConfirmation (conditional update)
│   │   ├── admin.ts                             # + pending in AdminPanel
│   │   ├── public.ts(+test)                     # + 4 public shapes
│   │   ├── seed.ts(+test)                       # NEW: seed runner logic
│   │   └── link-classes.ts(+test)               # NEW: plan + apply class links
│   ├── registration/
│   │   ├── offered-classes.ts(+test)            # NEW (pure)
│   │   └── availability.ts(+test)               # classes = offeredClasses(admission, classLevels)
│   ├── syllabi/slug.ts(+test)                   # NEW (pure)
│   ├── text/paragraphs.ts(+test)                # NEW: split on blank lines (exam body, syllabus intro)
│   ├── text/day-month.ts(+test)                 # NEW: validate + "31 July"
│   └── page-sections/
│       ├── dynamic.ts(+test)                    # NEW: visibleSections (pure)
│       └── dynamic-server.ts                    # NEW: resolveDynamicSections (server only)
├── models/settings.ts                           # + optional pendingConfirmation
├── models/settings-change.ts                    # NEW: removed-item change record (R3)
├── content/
│   ├── site-shell.ts(+test)                     # pageSections + 3 ids; legacy academics redirects; portalLinks removed
│   ├── admin.ts                                 # panel titles, tab labels, field labels, checklist, notices, confirm copy
│   ├── academics/sections.ts, admission/…       # public headings/labels ("Choose a class", "Age on")
│   ├── seed/{syllabi,examination,portal-links}.ts   # NEW: verbatim reference data + adaptations
│   └── no-portal-links.test.ts                  # NEW: no "/portal/" hrefs in src
├── app/
│   ├── (public)/academics/page.tsx              # visibleSections; Syllabi + Examination sections
│   ├── (public)/admission/page.tsx              # visibleSections; Class Levels section
│   ├── (public)/portal/                         # DELETED
│   └── admin/(dashboard)/settings/
│       ├── academics/page.tsx                   # NEW (pages)
│       ├── admission/page.tsx                   # + class-levels panel; checklist data
│       ├── site-wide/page.tsx                   # + portal-links panel
│       └── actions.ts(+test)                    # accepted panels; confirmSettingsPanel, confirmPagesPanel
├── components/
│   ├── academics/syllabi-section.tsx            # NEW (server) + syllabi-tabs.tsx (client island)
│   ├── academics/examination-section.tsx        # NEW (server)
│   ├── admission/class-levels-section.tsx       # NEW (server)
│   ├── site-shell/{public-shell,footer,header}.tsx  # portal links from Settings; dynamic children
│   └── admin/settings/
│       ├── field-control.tsx                    # lines, dayMonth, URL warning + Test link
│       ├── settings-panel-form.tsx              # editor slot
│       ├── panel-editor.tsx                     # NEW: editor kind → component
│       ├── settings-panel.tsx                   # pending notice + confirm
│       ├── syllabus-editor.tsx                  # NEW (client)
│       └── classes-checklist.tsx                # NEW (client)
└── test/access-inventory.test.ts                # academics page; actions perAccess {settings:2, pages:2}
next.config.ts                                   # /portal → /; remove explicit class-levels rule
scripts/seed-sections.ts, scripts/link-classes.ts   # NEW; package.json "seed:sections", "migrate:class-levels"
e2e/
├── admin-settings-portal-links.spec.ts          # NEW: US1
├── admin-settings-class-levels.spec.ts          # NEW: US2, US3 display
├── admin-settings-syllabi.spec.ts               # NEW: US4 admin + perf
├── admin-settings-examination.spec.ts           # NEW: US5 admin
├── admin-settings-seeded.spec.ts                # NEW: US6 notice + confirm
├── public-dynamic-sections.spec.ts              # NEW: public sections, tabs, hash, empty, widths, axe
├── page-sections.spec.ts                        # /portal rewrites
├── registration*.spec.ts, admin-settings-admission.spec.ts  # 013/014 updated to the checklist
├── admin-roles-access-matrix.spec.ts            # Academics rows
├── helpers/settings.ts                          # seed helpers for the new groups
└── helpers/layout.ts                            # NEW: widths 375/640/768/1024/1440, no scroll, no overlap
docs/architecture.md                             # Settings: new groups, engine fields, scripts
specs/011-roles-and-users/contracts/access-matrix.md   # new rows
```

**Structure Decision**: the existing single Next.js app. New groups sit beside the 005 groups in `src/lib/settings/groups`, and their panels are added to the 014 registry. Public sections follow the per-section component layout of 017–020.

## Key Design Points

1. **Groups, not stores (R1)**: all four sections reuse slice 1's save path. This is the main architectural choice (ADR-0014).
2. **Checklist as references in the existing list (R5–R7)**: no destructive data change. Deploying is a no-op for parents, the migration is optional and idempotent, and there is one server cross-check.
3. **Pending flag outside `data` (R8)**: confirming never conflicts with an open editor and never bumps the version.
4. **One resolver for empty sections (R11)**: the page, menu and search agree, following the 017 pattern.
5. **Size cap (R4)**: the brief's limits alone could exceed MongoDB's document limit. A 3,000-topic total cap closes that.

## Risks

- **Seed fidelity**: the reference's tab → content mapping is only clear from the HTML panes (the extracted text mislabels a block "Pre-Nursery"). Mitigation: capture from pane ids, put the data in a reviewed typed file, and print the adaptation report on every dry run (R10).
- **013 test churn**: the registration and admission E2E specs seed typed classes. They must seed Class Levels and ticks instead, or rely on "not linked" names (which are still offered). Diff failures against the admin baseline.
- **Editor performance**: a naive single state tree re-rendering every textarea could lag at ~500 topics. Mitigation: memoised level/subject/group components and one open level (R15), with an E2E long-task check (R17).

## ADR

- [ADR-0014: Dynamic Sections as Settings Groups, with the Admission Checklist as Level References](../../history/adr/0014-dynamic-sections-as-settings-groups.md) (Proposed). Covers Key Design Points 1–5.

## Complexity Tracking

None.

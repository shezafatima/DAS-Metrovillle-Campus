# Implementation Plan: Admission Page — Admission Procedure, Admission Window and Uniform

**Branch**: `020-admission` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/020-admission/spec.md`

## Summary

Replace the placeholder `/admission` page with two anchored sections. **Admission Procedure** shows the reference text from `https://das.edu.pk/admission/` (sections 1–4) as typed content with real lists and a fee table. Above it is a window notice driven by a new **Settings → Admission** group (Opens on, Closes on, Announcement, Closed message). Below it is an **Apply Now** button gated by the single function `isAdmissionApplyOpen()`. **Uniform** shows six groups as flip cards, using the home coverflow after its behaviour is extracted into a shared `FlipCoverflow` component.

Main technical decisions:
1. The page renders per request (`connection()`), and open/closed is computed on every request from the cached saved dates and the current Asia/Karachi calendar day. This gives an automatic midnight switch with no scheduler (ADR-0011).
2. The 005 Settings engine gains a `date` field type and a group-level `dateOrder` rule. Both use one shared schema, so the browser and the server always apply the same rules.
3. The coverflow behaviour moves into one shared component, and the home markup and test ids stay identical.
4. Content files and fidelity tests follow the 018 pattern.

## Technical Context

**Language/Version**: TypeScript (strict), Node (full ICU)
**Primary Dependencies**: Next.js 16.3 App Router (no Cache Components), React, Tailwind v4, shadcn/ui primitives (`ui/form`), Zod 4, Mongoose, lucide-react (`Shirt` icon), Motion (not needed here)
**Storage**: MongoDB `settings` collection: one new group document `_id: "admission"`. No schema, index or migration change.
**Testing**: Vitest (unit, component, server action), Playwright + `@axe-core/playwright` (E2E, a11y)
**Target Platform**: Vercel (Node runtime); browsers per existing support; checked at 375/768/1024/1440 px plus the reference breakpoints 480/640/782/1280 and 1023/1025 around the menu collapse
**Project Type**: Single Next.js web app (public site + admin dashboard)
**Performance Goals**: `/admission` server render adds one cached Settings read and pure date math, with no extra DB round trip while cached. Coverflow keeps 006's transform/opacity-only animation.
**Constraints**: Open/closed must never be served from a cache across 00:00 Asia/Karachi. No new dependencies. Home coverflow must be unchanged. Theme colours and fonts must be unchanged; new sizes go in as tokens.
**Scale/Scope**: 1 public page, 1 admin settings group, 4 content files, 5 cards (Hifz girls not shown), 4 images

## Constitution Check

*GATE: checked before Phase 0 and again after Phase 1 design. Constitution v3.0.0.*

| Principle | Check | Status |
|---|---|---|
| I. Purpose & Fidelity | The text is copied word for word from the live reference, and fidelity tests check it against saved source text. Two documented differences: the source URL (the brief's URL is 404, Q1), and the omitted age table and promotional ending (Q1, approved). The reference contradicts itself on the tuition fee and on the senior girls' qamiz; both are flagged for the client, not resolved by guessing. The admission window is not on the reference: it comes from the brief and the PRD's registration scope (013), and this feature only prepares it. Layout deviations V1–V7 are listed in spec.md "Deviations from the reference"; T071 checks the result against the screenshots. | PASS |
| II. Fixed Stack | No new packages. `sharp` is already present via Next, and `Intl` is built in. | PASS |
| III. Roles & Access | The Admission group goes through the existing `requireAdminPage("settings")` / `requireAdminAccess("settings")` checks on the server. Saves record `updatedBy` and log `settings_saved`. | PASS |
| IV. Security | No new public form or endpoint. The test clock override only works when `freshReadsForTests()` is true, which is never the case in production. | PASS |
| V. Personal Data | No personal data is collected (the form is 013). | N/A |
| VI. Data Integrity | One Zod schema covers the browser and the server, including the new date rule. The group is one document keyed by `_id`, with no natural-key duplication. | PASS |
| VII. Design System | New card-size tokens are added to `research/design-tokens.md` first ("Admission page (020)"), then to `globals.css`. Colours use existing tokens (`bg-topbar`, `text-primary`, `bg-primary`, `bg-surface`, muted band). Scrolling to a section uses the existing `--anchor-scroll-margin` via `.anchor-section`. | PASS |
| VIII. Content | Client-edited content (the window) lives in a typed field group in the database. Non-edited content (procedure, uniform) lives in typed content files with the shape 014 will edit. A save shows on the site without a redeploy, and the date changes over at midnight by itself. | PASS |
| IX. Components | Each section is its own component, and the page only composes them. Server Components are the default; the only client code is `FlipCoverflow`, which already existed, and the date input. The coverflow is extracted once and reused, not copied. All copy is in content files. | PASS |
| X. Extensibility | `getAdmissionWindow()` / `isAdmissionApplyOpen()` are server functions that 013 (and a later chatbot) can call. No speculative API is built. | PASS |
| XI. Testing & DoD | Every user story has an E2E spec. The admin route is covered by the three-case access matrix (inherited loop plus the access E2E). The page is checked at 375, 768, 1024 and 1440 px and at the reference breakpoints. axe runs with the window open and closed. US6: the E2E test covers the hidden state; the shown state is unit-tested until 013 removes the build-time constant and adds its E2E. | PASS (to verify at the end) |

Post-design re-check (after Phase 1): unchanged, all PASS. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/020-admission/
├── spec.md
├── plan.md                 # this file
├── research.md             # R1–R12
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admission-window.md
│   ├── settings-admission-group.md
│   ├── flip-coverflow.md
│   └── routes-and-navigation.md
├── checklists/requirements.md
└── tasks.md                # /sp.tasks (not created here)
```

### Source Code (repository root)

```text
docs/content-source/admission/
├── procedure.txt                     # NEW verbatim source text (URL + retrieval date header)
└── uniform.txt                       # NEW

public/images/admission/uniform/      # NEW kids-boys.png, kids-girls.png, senior-boys.png, senior-girls.png

src/
├── app/
│   ├── (public)/admission/page.tsx                      # REWRITE: connection(), PageBanner, composed sections
│   └── admin/(dashboard)/settings/admission/page.tsx    # NEW: group page + status line
├── components/
│   ├── ui/flip-coverflow.tsx                            # NEW: behaviour extracted from quick-access-cards
│   ├── home/quick-access-cards.tsx                      # REFACTOR: thin wrapper, identical output
│   ├── admission/
│   │   ├── admission-procedure.tsx                      # NEW: section (AboutSection) + procedure blocks
│   │   ├── procedure-blocks.tsx                         # NEW: paragraph/subheading/bullets/numbered/steps/fee table
│   │   ├── admission-window-notice.tsx                  # NEW: banner | quiet note | nothing
│   │   ├── apply-button.tsx                             # NEW: Apply Now link (rendered only when allowed)
│   │   └── uniform-section.tsx                          # NEW: section + FlipCoverflow items
│   ├── admin/settings/field-control.tsx                 # EDIT: date control
│   ├── admin/settings/settings-group-view.tsx           # EDIT: optional status slot
│   └── site-shell/anchored-sections.tsx                 # REMOVE AnchoredPage if no longer used (check)
├── content/
│   ├── admission/{procedure,uniform,registration,index}.ts   # NEW
│   ├── admission/{content,fidelity}.test.ts                  # NEW
│   ├── admin.ts                                              # EDIT: admission group copy, date/rule errors, status text
│   └── site-shell.ts (+ .test.ts)                            # EDIT: drop class-levels
├── lib/
│   ├── admission/{schema,window,server}.ts (+ window.test.ts, server.test.ts)  # NEW
│   └── settings/{types,schema,defaults,public,registry}.ts   # EDIT: date type, group rules, admission group
│       └── groups/admission.ts                               # NEW
└── app/globals.css                                           # EDIT: uniform card size tokens

next.config.ts                          # EDIT: /admission/class-levels → /admission
research/design-tokens.md               # EDIT: "Admission page (020)" token section

e2e/
├── admission.spec.ts                   # NEW: structure, anchors, procedure text and lists, axe
├── admission-uniform.spec.ts           # NEW: uniform cards (hover/tap/keyboard/auto-advance/reduced motion), headings, widths + reference breakpoints, axe
├── admission-window.spec.ts            # NEW: open/upcoming/closed/empty, PKT boundaries via e2e-now, Apply hidden, axe open+closed
├── admin-settings-admission.spec.ts    # NEW: save, rule refusal, status line, access
├── page-sections.spec.ts               # EDIT: admission sections, class-levels redirect
└── admin-settings-access.spec.ts       # EDIT: include /admin/settings/admission
```

**Structure Decision**: This is the existing single Next.js app. New domain logic goes in `src/lib/admission/`, content in `src/content/admission/`, and section components in `src/components/admission/`, mirroring `about` and `academics`. The shared coverflow moves to `src/components/ui/` because it is no longer home-specific.

## Implementation Phases (input for /sp.tasks)

1. **Foundation**: Settings engine `date` type and `dateOrder` rule, with unit tests. Then `src/lib/admission/window.ts` (pure core and server functions) and its boundary test matrix.
2. **Settings → Admission (US2)**: group definition, copy, admin page with the status line, access and save tests, E2E.
3. **Navigation and redirects (US5)**: `pageSections`, the class-levels redirect, updated sections and redirect specs.
4. **Procedure and window on the page (US1, US3, US6)**: verbatim source files, content and schema, fidelity tests, section components, the per-request page, the banner and note, the Apply button through `isAdmissionApplyOpen()`, E2E with `e2e-now`.
5. **Coverflow extraction**: `FlipCoverflow` plus the `QuickAccessCards` wrapper, with the home specs run before and after (they must pass unchanged).
6. **Uniform (US4)**: copy and recompress the photos, uniform content and fidelity test, size tokens, `UniformSection`, E2E (flip by hover, tap and keyboard; auto-advance pause; reduced motion; no-photo fronts; four widths).
7. **Polish and DoD**: axe with the window open and closed, the build route table (`/admission` = ƒ), lint and typecheck, report the redirect mapping and the links that were checked.

## Risks

- **The home coverflow regresses during extraction.** Mitigation: run `e2e/home-cards.spec.ts` before touching it and keep it green after each step. Test ids and classes stay the same.
- **Some per-request rendering still caches.** Mitigation: `connection()` at the top of the page, the build route table must show ƒ, and E2E switches `e2e-now` with no save in between.
- **The uniform card back overflows at 375 px.** Mitigation: size tokens are set to fit the longest group, the back scrolls as a fallback, and an E2E check confirms every item is visible on every card at every width.

## Complexity Tracking

None. The Constitution Check has no violations.

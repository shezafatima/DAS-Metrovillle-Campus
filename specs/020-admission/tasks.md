# Tasks: Admission Page — Admission Procedure, Admission Window and Uniform

**Input**: Design documents from `specs/020-admission/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (admission-window, settings-admission-group, flip-coverflow, routes-and-navigation), quickstart.md
**ADR**: history/adr/0011-admission-window-evaluation.md

**Tests**: Requested by the spec and the brief (unit tests for the window boundaries, E2E for every story, axe, home coverflow regression). Within each story, test tasks come first and must fail before the implementation.

**Organization**: One phase per user story from spec.md, in the spec's order: US1–US4 are P1, US5 is P2, US6 is P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 … US6 from spec.md
- All paths are repo-relative to `E:\dar-e-arqam-mc\`

## Working rules (apply to every task)

- Never run `npm run build` and Playwright at the same time. Run them one after the other.
- Admin E2E specs fail in some places on unchanged code. Judge regressions against the T001 baseline, not against "all green". Start the Playwright dev server before admin specs (it is slow to start).
- Copy from the reference stays word for word. Never reword it, including its grammar ("Application for Grade-1 onward are tested", "Fees paid after the due date is").
- No new npm dependencies (Constitution II). No raw colour or size values in components (Constitution VII).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Clean starting point, verbatim sources and assets on disk.

- [X] T001 Confirm the uncommitted `020-news-category-label` edits (`e2e/admin-home-news-band.spec.ts`, `src/components/home/latest-news.tsx`) have been committed or stashed by the requester (ask; do not commit them yourself). Then run `npx playwright test e2e/home-cards.spec.ts e2e/home.spec.ts e2e/page-sections.spec.ts e2e/desktop-navigation.spec.ts e2e/mobile-navigation.spec.ts e2e/admin-settings-access.spec.ts e2e/admin-settings-saving.spec.ts` and record the pass/fail list in `specs/020-admission/baseline.md`
- [X] T002 [P] Save the verbatim procedure text (sections 1–4 exactly as recorded in spec.md "Reference Content → Admission procedure", one line per heading, paragraph or list item, numbered steps keeping their "1. " prefix, fee rows as `A | Registration Fee | Non-refundable`) with a first line `# Source: https://das.edu.pk/admission/ (retrieved 2026-10-14)` in `docs/content-source/admission/procedure.txt`. Keep `’` and `–` characters and save as UTF-8 with LF line endings
- [X] T003 [P] Save the verbatim uniform text (category heading, gender heading, then the five items, in reference order, exactly as in spec.md "Reference Content → Uniform", keeping `’` and `&`) with a first line `# Source: https://das.edu.pk/admission/uniform/ (retrieved 2026-10-14)` in `docs/content-source/admission/uniform.txt`, UTF-8, LF
- [X] T004 [P] Add `docs/content-source/admission/README.md` stating the two sources, the retrieval date, what was left out (empty age table; "4. Success" onward; the red next-step buttons "Registration", "Admission Test", "Admission Formalities", "Success" — spec deviation V3) and that the text is pending client confirmation
- [X] T005 [P] Write a one-off script in the session scratchpad (not in the repo) that uses the `sharp` already in `node_modules` to recompress losslessly (PNG, keep alpha and dimensions) `public/images/uniform/kids-boys-uniform.png` → `public/images/admission/uniform/kids-boys.png`, `kids-girls-uniform.png` → `kids-girls.png`, `boys-uniform.png` → `senior-boys.png`, `girls-uniform.png` → `senior-girls.png`. Run it and report the before/after sizes. Leave `public/images/uniform/` untouched

**Checkpoint**: Baseline recorded, sources and photos in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The Settings engine additions, the admission window module, the `admission` group and the per-request page shell. Every story depends on these.

**⚠️ CRITICAL**: No user story work starts until this phase is done.

### Tests first

- [X] T006 [P] Write failing unit tests for the date field and the group rule in `src/lib/settings/schema.test.ts`: `""` accepted; `"2027-03-31"` accepted; `"2027-02-30"`, `"31/03/2027"`, `"2027-3-1"` refused with `settingsCopy.errors.date`; a `required` date refuses `""`; `dateOrder` refuses closesOn < opensOn with the message at path `closesOn`; it accepts equal dates; it ignores the rule when either date is `""`; existing groups (`contact`, `hero`, `stats`, `video`) parse exactly as before
- [X] T007 [P] Write failing unit tests for `src/lib/admission/window.ts` in `src/lib/admission/window.test.ts` covering every row of the matrix in `specs/020-admission/contracts/admission-window.md` (empty dates, the 18:59:59Z / 19:00:00Z instants on both edges, same-day window, malformed date), plus `karachiToday` around UTC midnight, `formatAdmissionDate("2027-03-31") === "31 March 2027"` and `formatAdmissionDate("2027-01-01") === "1 January 2027"`, and `admissionStatusText` for open, upcoming and closed. Inside the test, set `process.env.TZ` to `America/New_York` and then `Asia/Karachi` (restoring the original afterwards) and assert identical results, proving they do not depend on the process time zone
- [X] T008 [P] Write failing unit tests for the admission group in `src/lib/settings/public.test.ts` (or a new `src/lib/settings/admission.test.ts`): defaults are all `""`; `toPublicShape("admission", …)` returns the four strings; a whitespace-only announcement is stored and shown as `""`; an announcement over 160 characters is refused

### Settings engine: date field and group rules

- [X] T009 Add `DateField` (`type: "date"`, optional `default`), `GroupRule` (`{ kind: "dateOrder"; from; to; message }`), optional `rules?: GroupRule[]` on `GroupDefinition`, and `"admission"` to `GROUP_KEYS` in `src/lib/settings/types.ts`
- [X] T010 Add copy to `src/content/admin.ts`: `settingsCopy.groups.admission` (`title: "Admission"`, a one-line description of the admission window), `settingsCopy.fields.admission` (labels "Opens on", "Closes on", "Announcement", "Closed message" and hints per `contracts/settings-admission-group.md`), `settingsCopy.errors.date` ("Enter a real date."), `settingsCopy.errors.closesBeforeOpens` ("Closes on must be on or after Opens on."), and `settingsCopy.admissionStatus` (`open: (date) => \`Open now until ${date}\``, `upcoming: (date) => \`Opens on ${date}\``, `closed: "Closed"`)
- [X] T011 Implement `dateSchema(field)` (trimmed; `""` or `^\d{4}-\d{2}-\d{2}$` that round-trips through `Date.UTC`) in `fieldSchema`, and apply `def.rules` in `schemaFor()` with `superRefine` (issue path `[rule.to]`, only when both values are non-empty), in `src/lib/settings/schema.ts`. T006 must pass
- [X] T012 [P] Add `case "date": return field.default ?? ""` to `defaultForField` in `src/lib/settings/defaults.ts`
- [X] T013 [P] Add `case "date"` to `FieldControl` in `src/components/admin/settings/field-control.tsx`: a native `<input type="date">` through `FormControl` inside `FormField`/`FormLabel`, value `""` when empty, `onChange` passes the input's `value` and clears the field error, with the hint as `FormDescription` and the error as `FormMessage`

### The `admission` group

- [X] T014 Create `src/lib/settings/groups/admission.ts` exporting `admissionDefinition` (fields `opensOn`, `closesOn` as `date`; `announcement`, `closedMessage` as `text` with `maxLength: 160`; `rules: [{ kind: "dateOrder", from: "opensOn", to: "closesOn", message: settingsCopy.errors.closesBeforeOpens }]`, labels and hints from `settingsCopy`) and register it as `admission: admissionDefinition` in `src/lib/settings/registry.ts`
- [X] T015 Add `PublicAdmission` (`opensOn`, `closesOn`, `announcement`, `closedMessage`, all strings) to `PublicShapes` and an `"admission"` case to `toPublicShape` in `src/lib/settings/public.ts`. T008 must pass
- [X] T016 [P] Add `"admission"` to the `SettingsGroupKey` type used by `seedSettingsGroup` / `readSettingsGroup` / `openGroup` in `e2e/helpers/settings.ts`

### Admission window module

- [X] T017 Create `src/content/admission/registration.ts` with `export const registrationFormExists = false;` and a comment that 013 deletes this constant when `/admission/register` exists
- [X] T018 Implement the pure functions `karachiToday`, `admissionWindowState`, `formatAdmissionDate`, `admissionStatusText` and the `AdmissionWindowState` type in `src/lib/admission/window.ts`, per `contracts/admission-window.md` (use `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", … })` for today and `en-GB` long month with `timeZone: "UTC"` on `Date.UTC(y, m - 1, d)` for display; treat malformed dates as empty). T007 must pass
- [X] T019 Implement the server-only functions in `src/lib/admission/server.ts` (`import "server-only"`). `getAdmissionWindow()`: `await connection()` from `next/server`, `getPublicSettings("admission")`, and `now` taken from the `e2e-now` cookie (`cookies()` from `next/headers`, valid ISO instant) only when `freshReadsForTests()` is true, else `new Date()`; it returns `{ state, announcement, closedMessage }`. `isAdmissionApplyOpen()`: `(await getAdmissionWindow()).state.kind === "open" && registrationFormExists`. Add a JSDoc pointing at ADR-0011 and stating that 013 reuses `getAdmissionWindow()` to refuse submissions
- [X] T020 [P] Write unit tests in `src/lib/admission/server.test.ts` (mock `next/server` `connection`, `next/headers` `cookies`, `@/lib/settings/public`, `@/lib/e2e-fresh-reads`, and `@/content/admission/registration` via `vi.mock`): the cookie is ignored when `freshReadsForTests()` is false; it is used when true; an invalid cookie falls back to the real time; `isAdmissionApplyOpen()` is false with the flag off in every state, true only when the flag is on and the state is open; a failed Settings read (defaults) gives `closed`

### Page shell

- [X] T021 Create `src/lib/admission/schema.ts` with Zod schemas `procedureSchema` and `uniformSchema` and their inferred types, exactly as in `specs/020-admission/data-model.md` §4–§5 (four procedure sections with unique ids; uniform groups (at least one) with unique ids; non-empty trimmed strings; `image.src` must start with `/images/admission/uniform/`; non-empty `image.alt`), plus `admissionPageSchema` (`title`, `bannerTrail`)
- [X] T022 Create `src/content/admission/page.ts` (page title "Admission", breadcrumb trail `["Admission"]`) and `src/content/admission/index.ts`, which parses at module load and exports `admissionPage` and `admissionReviews` (status `"pending-client-approval"`, notes listing the spec's "Open Questions for the Client"); procedure and uniform exports are added by US1 and US4
- [X] T023 Rewrite `src/app/(public)/admission/page.tsx`: `metadata` (`title: "Admission"`, `alternates.canonical: "/admission"`), an async page that calls `await connection()` first, renders `PageBanner` (the only `h1`, title and trail from `admissionPage`, `breadcrumbHome` as used by `src/app/(public)/academics/page.tsx`) and maps `pageSections.admission` to section components with a `switch` on `section.id` (cases filled by US1 and US4; unknown ids render `null`)

**Checkpoint**: `npx vitest run src/lib/settings src/lib/admission` passes; `npx tsc --noEmit` passes; `/admission` renders the banner h1 with no sections yet.

---

## Phase 3: User Story 1 — Read how to apply (Priority: P1) 🎯 MVP

**Goal**: The Admission Procedure section shows the reference text (sections 1–4) word for word, with real lists and the fee table, reachable from the menu.

**Independent Test**: Open `/admission#admission-procedure`. Every heading, sentence and list item matches `docs/content-source/admission/procedure.txt`; steps are an `<ol>`; document and received-item lists are `<ul>`; the fee list is a table; the heading is below the fixed header.

### Tests for User Story 1 ⚠️

- [X] T024 [P] [US1] Write a failing fidelity test in `src/content/admission/fidelity.test.ts` (pattern: `src/content/academics/fidelity.test.ts`): every displayed procedure string (headings, paragraphs, subheadings, list items, step texts with the "N. " prefix restored, fee rows joined as `A | Registration Fee | Non-refundable`) appears in `procedure.txt` in the same order, and every non-header line of `procedure.txt` is displayed
- [X] T025 [P] [US1] Write a failing E2E spec in `e2e/admission.spec.ts`: exactly one `h1`; section ids in order `admission-procedure`, `uniform`; the procedure's h3s are "1. Eligibility", "2. Register for Admission Test", "3. Admission Test", "4. Admission Formalities"; the Admission Formalities steps are one `<ol>` of 7 items, the second containing the 4 document items; Rules of Payment is an `<ol>` of 6; the fee table has 5 rows with row headers A–E; choosing Admission → Admission Procedure in the desktop dropdown and in the mobile menu lands on `/admission#admission-procedure` with the h2 fully below the header; no text "Success", "Apply Below!" or "500,000"; an axe scan has no violations

### Implementation for User Story 1

- [X] T026 [US1] Create `src/content/admission/procedure.ts` exporting `admissionProcedure` (`source: "https://das.edu.pk/admission/"`, the four sections with blocks per data-model §4, copied character for character from `docs/content-source/admission/procedure.txt`; step text without the "N. " prefix; step 2 with `bullets`, step 6 with `fees`) and a `review` marker (`pending-client-approval`, notes: campus applicability, age criteria per class, tuition monthly vs every two months); parse it in `src/content/admission/index.ts` with `procedureSchema`. T024 must pass
- [X] T027 [P] [US1] Create `src/components/admission/procedure-blocks.tsx` (server): renders the `paragraph` (`<p>`), `subheading` (`<h4>`), `bullets` (`<ul>`), `numbered` (`<ol>`) and `steps` (`<ol>`, each `<li>` with its text, then a nested `<ul>` for `bullets`, or for `fees` a `<table>` with `aria-labelledby` set to the step text's id, each row `<th scope="row">{letter}</th><td>{name}</td><td>{note}</td>`) blocks. Use existing typography tokens (`font-body text-body text-text`, list styles as in `src/components/academics/*`) and no new colours
- [X] T028 [US1] Create `src/components/admission/admission-procedure.tsx` (server): `AboutSection` with `id="admission-procedure"`, `background="surface"`, heading from `pageSections` ("Admission Procedure"), then, in order, a `notice` slot (US3), each procedure section as a centred `<h3>` followed by its first paragraph (the step's intro line) centred, as on the reference (spec deviation V2), then the remaining `ProcedureBlocks` left-aligned, and an `action` slot (US6). Wire the `"admission-procedure"` case in `src/app/(public)/admission/page.tsx`
- [ ] T029 [US1] Run `npx vitest run src/content/admission` and `npx playwright test e2e/admission.spec.ts --grep "procedure|h1|axe"` and fix until they pass

**Checkpoint**: The procedure is complete and verified. This is the MVP slice.

---

## Phase 4: User Story 2 — Admin opens and closes admissions (Priority: P1)

**Goal**: Settings → Admission lets a user with the Settings permission set the window, refuses invalid saves, logs saves, and states the public state in words.

**Independent Test**: As a Settings user, save several date combinations and read the status line; check the refusals; check the access cases and the log line.

### Tests for User Story 2 ⚠️

- [X] T030 [P] [US2] Extend `src/app/admin/(dashboard)/settings/actions.test.ts` with admission-specific cases (the three access cases already loop over `GROUP_KEYS`; confirm `admission` is included): a valid save stores `{opensOn, closesOn, announcement, closedMessage}` with `updatedBy` and logs `settings_saved` with `group: "admission"`; closesOn < opensOn returns `invalid` with `fields.closesOn` and stores nothing; a 161-character announcement returns `invalid` with `fields.announcement`
- [X] T031 [P] [US2] Write a failing E2E spec in `e2e/admin-settings-admission.spec.ts` (use the `e2e/helpers/settings.ts` helpers; dates relative to the real Pakistan-time today): the status reads "Closed" with no saved group; saving yesterday → +30 days shows the toast and "Open now until {date}"; saving next month → +2 months shows "Opens on {date}"; Closes on before Opens on shows the message under Closes on and `readSettingsGroup("admission")` is unchanged; clearing one date gives "Closed"; the date inputs work from the keyboard; an axe scan of the page passes
- [X] T032 [P] [US2] Add `/admin/settings/admission` to `GROUP_PATHS` and `"admission"` to the visible-group loop in `e2e/admin-settings-access.spec.ts` (no session → sign-in; content manager without `settings` → denied; with `settings` → sees the Admission link)

### Implementation for User Story 2

- [X] T033 [US2] Add an optional `status?: string` prop to `SettingsGroupView` in `src/components/admin/settings/settings-group-view.tsx`, rendered under the description as `<p role="status" data-testid="settings-status">` (existing muted admin text classes), and update its JSDoc ("the five group pages" → current count)
- [X] T034 [US2] Create `src/app/admin/(dashboard)/settings/admission/page.tsx` (pattern: `settings/stats/page.tsx`): `metadata.title "Admission"`, `dynamic = "force-dynamic"`, `await requireAdminPage("settings")`, `getAdminSettings("admission")`, `status = admissionStatusText(admissionWindowState(initial.data as {opensOn: string; closesOn: string}, new Date()))`, rendering `<SettingsGroupView group="admission" initial={initial} status={status} />`
- [X] T035 [US2] Confirm `SettingsNav` (`src/components/admin/settings/settings-nav.tsx`) shows "Admission" (it derives from `GROUP_KEYS`), update its comment ("four settings groups") and check the admin settings index redirect (`src/app/admin/(dashboard)/settings/page.tsx`) still goes to the first group
- [ ] T036 [US2] Run `npx vitest run "src/app/admin/(dashboard)/settings"` and then (Playwright dev server up, no build running) `npx playwright test e2e/admin-settings-admission.spec.ts e2e/admin-settings-access.spec.ts`; compare with the T001 baseline

**Checkpoint**: Admins can manage the window; nothing is shown publicly yet beyond the procedure.

---

## Phase 5: User Story 3 — Parents see whether admissions are open (Priority: P1)

**Goal**: The banner or quiet note above the procedure, switching at 00:00 Pakistan time with no save or redeploy.

**Independent Test**: Seed dates, set `e2e-now` to 23:59:59 and 00:00:00 Pakistan time around each edge, and reload with no save in between; check banner, note and nothing.

### Tests for User Story 3 ⚠️

- [X] T037 [P] [US3] Write a failing E2E spec in `e2e/admission-window.spec.ts` (seed with `seedSettingsGroup("admission", …)`, set the `e2e-now` cookie with `context.addCookies`): open + announcement → `admission-banner` shows the announcement and "Applications close on 31 March 2027"; open without announcement → only the close line; 2026-12-31T18:59:59Z with Opens on 2027-01-01 → no banner, and the closed note if set; 2026-12-31T19:00:00Z → banner; 2027-03-31T18:59:59Z → banner; 2027-03-31T19:00:00Z → no banner; empty Opens on → closed; closed with no message → neither element exists; the banner sits above the first procedure h3; axe passes with the banner and with the note; there is no `admission-apply` in any state
- [X] T038 [P] [US3] Write a component test in `src/components/admission/admission-window-notice.test.tsx`: open with and without an announcement, closed with and without a message (renders `null`), upcoming treated as closed; the banner has `role="status"`

### Implementation for User Story 3

- [X] T039 [P] [US3] Add the public copy to `src/content/admission/page.ts` (`closesOn: (date) => \`Applications close on ${date}\``) and parse it through `admissionPageSchema`
- [X] T040 [US3] Create `src/components/admission/admission-window-notice.tsx` (server): for `state.kind === "open"`, a `<div role="status" data-testid="admission-banner">` on `bg-topbar` with `text-primary` (existing tokens, padding with existing spacing tokens) containing the announcement (if non-empty) and the close line using `formatAdmissionDate`; otherwise, if `closedMessage` is non-empty, a `<p data-testid="admission-closed-note">` in muted body text; otherwise `null`. T038 must pass
- [X] T041 [US3] In `src/app/(public)/admission/page.tsx` call `getAdmissionWindow()` and pass `<AdmissionWindowNotice … />` into the `notice` slot of `AdmissionProcedureSection`
- [ ] T042 [US3] Run `npx playwright test e2e/admission-window.spec.ts` (dev server with `E2E_FRESH_READS=1`) and fix until it passes

**Checkpoint**: The window is visible to parents and switches by itself.

---

## Phase 6: User Story 4 — See the uniform for each group (Priority: P1)

**Goal**: Five flip cards built on the shared coverflow (the Hifz girls' card is not shown, spec V8); the home cards stay unchanged.

**Independent Test**: `/admission#uniform` shows five cards in reference order; each flips by hover, tap and keyboard; each back lists its five items; every front shows its photo on the light grey photo panel (a group without a photo would show the uniform icon); `e2e/home-cards.spec.ts` gives the same result as at T001.

### Tests for User Story 4 ⚠️

- [X] T043 [P] [US4] Extend `src/content/admission/fidelity.test.ts` for the uniform: every category, gender and item matches `docs/content-source/admission/uniform.txt` in order, less the Hifz girls' group (left out, spec V8); 5 groups; 5 items each; the image `src` exists on disk under `public/images/admission/uniform/`; every shown group has an image (the Hifz boys' photo was supplied by the requester); the displayed category and gender strings equal the source lines exactly
- [X] T044 [P] [US4] Write a failing E2E spec in `e2e/admission-uniform.spec.ts`, modelled on `e2e/home-cards.spec.ts` and using the `uniform-*` test ids:
  - five `uniform-card`s whose h3 accessible names are, in order, "Kids Uniform – Boys", "Kids Uniform – Girls", "Hifz Students’ Uniform – Boys", "Senior Students’ Uniform – Boys", "Senior Students’ Uniform – Girls" (no Hifz girls' card); each `uniform-items` list's accessible name equals its card's heading; the page's heading list has exactly five uniform h3s;
  - mouse: hover flips the centre card and shows its `uniform-items` `<ul>` with 5 `li`, matching the content;
  - auto-advance moves one card at a time, pauses while flipped, hovered and focused, and loops;
  - keyboard: Tab to the centre `uniform-flip`, focus shows the back, arrows move and keep focus;
  - touch (`hasTouch` context): tap flips and a second tap unflips, a swipe changes the card without flipping, a tap outside unflips;
  - reduced motion: no auto-advance and the back cross-fades;
  - the flip control is a `button` and no `a` exists inside any uniform card;
  - the Hifz fronts contain an `svg` icon and no `img`, and the other fronts have an `img` with non-empty alt;
  - at 375, 768, 1024 and 1440 px and the reference breakpoints 480, 640, 782, 1023, 1025 and 1280 px: `scrollWidth <= innerWidth`, and for each card, once flipped, every `li` is within the back face's visible box;
  - an axe scan of `#uniform` passes

### Implementation for User Story 4

- [X] T045 [US4] Extract the coverflow behaviour from `src/components/home/quick-access-cards.tsx` into `src/components/ui/flip-coverflow.tsx` per `contracts/flip-coverflow.md` (props `items`, `label`, `flipLabel`, `positionLabel`, `header`, `as`, `className`, `stageClassName`, `testIdPrefix` defaulting to `"quick-access"`). Move all the state, effects, gesture handlers, the `.qa-*` structure, the flip `<button>` and the back-face click handler unchanged. `as="div"` adds `role="group"`
- [X] T046 [US4] Rewrite `QuickAccessCards` in `src/components/home/quick-access-cards.tsx` as a wrapper that builds today's four fronts (icon `Image`, `h3` title with its tone class, text) and backs (`aria-hidden` title and text, the `quick-access-link` Read More `Link`), and passes `as="section"`, today's root classes, today's stage size classes, `label`, `flip`, `homeContent.carousel.position`, and a `header` with the existing `SectionHeading`. The rendered DOM, classes and test ids must equal the pre-refactor output
- [ ] T047 [US4] Run `npx playwright test e2e/home-cards.spec.ts e2e/home.spec.ts` and compare with the T001 baseline. Any new failure blocks the next task. Also diff the home quick-access HTML before and after (save both from `curl http://localhost:3000/` in the scratchpad) and confirm there is no difference inside `section[aria-label="Quick links"]`
- [X] T048 [P] [US4] Add a "Admission page (020)" section to `research/design-tokens.md` (uniform card width and height at base and `lg`, photo box height, the back's list gap; note that no reference value exists and these are chosen so five items fit at 375 px) and the matching custom properties (`--spacing-uniform-card-w`, `--spacing-uniform-card-h`, `--spacing-uniform-card-w-lg`, `--spacing-uniform-card-h-lg`, `--spacing-uniform-photo-h`) in the `@theme` block of `src/app/globals.css`
- [X] T049 [US4] Create `src/content/admission/uniform.ts` exporting `uniformContent` (`source: "https://das.edu.pk/admission/uniform/"`, the six groups with verbatim `category`, `gender` and `items` from `uniform.txt`, `image` for the four photo groups only, with the alt texts from research R9 describing the visible garments), plus carousel `label` "Uniforms" (no separate card-title map: each heading is built as `${category} – ${gender}`), `flipLabel` and `positionLabel` copy, and a `review` marker (notes: lists date from 2019, Metroville applicability, Hifz photos, senior girls' qamiz colour). Parse it in `src/content/admission/index.ts` with `uniformSchema`. T043 must pass
- [X] T050 [US4] Create `src/components/admission/uniform-section.tsx` (server): `AboutSection` with `id="uniform"`, `background="muted"`, heading "Uniform", containing `FlipCoverflow` with `as="div"`, `testIdPrefix="uniform"`, `stageClassName` setting `--qa-w`/`--qa-h` from the new tokens. Front: a photo box of `--spacing-uniform-photo-h` holding `next/image` (`fill`, `object-contain`, `sizes` matching the card width), or, with no image, lucide `Shirt` (`aria-hidden`) on `bg-surface`; then `<h3 id="uniform-{id}-title">` containing `<span>{category}</span>` as a small label, `<span class="sr-only"> – </span>` and `<span>{gender}</span>` as the main text, so its accessible name is e.g. "Kids Uniform – Boys". Back: `bg-primary` (theme navy, as on the home coverflow; not the reference's cyan/pink — spec deviation V7), the same label and gender drawn the same way in white but `aria-hidden` (one heading per card), then `<ul data-testid="uniform-items" aria-labelledby="uniform-{id}-title">` of items in white body text, with `overflow-y-auto` as the overflow fallback. Flip button name: `flipLabel("{category} – {gender}")`. The label uses existing type tokens; any new size goes into T048. Wire the `"uniform"` case in `src/app/(public)/admission/page.tsx`
- [ ] T051 [US4] Run `npx playwright test e2e/admission-uniform.spec.ts` and fix until it passes. Adjust only the T048 tokens (and the token doc) if any width clips text

**Checkpoint**: Both sections are complete; the home page is unchanged.

---

## Phase 7: User Story 5 — Old links and the menu still work (Priority: P2)

**Goal**: The menus list exactly two Admission anchors, Class Levels is gone, and old URLs redirect.

**Independent Test**: Request the three old URLs and check their destinations; count the menu entries on desktop and mobile.

### Tests for User Story 5 ⚠️

- [X] T052 [P] [US5] Update `e2e/page-sections.spec.ts`: `/admission` expects `["admission-procedure", "uniform"]`; replace the `#class-levels` navigation case with `/admission/class-levels` → final URL `/admission` (status 308 on the first response); keep `/admission/uniform` → `/admission#uniform` and `/admission/admission-procedure` → `/admission#admission-procedure`; the desktop dropdown and the mobile menu show exactly "Admission Procedure", "Uniform"
- [X] T053 [P] [US5] Update Admission section expectations only where a test lists them (a plan-time grep found none outside `src/content/site-shell.ts` and `e2e/page-sections.spec.ts`; re-check `src/content/site-shell.test.ts`, `src/components/site-shell/*.test.tsx` and `src/lib/site-search.test.ts`, and remove Class Levels wherever it appears)

### Implementation for User Story 5

- [X] T054 [US5] Remove `{ id: "class-levels", label: "Class Levels" }` from `pageSections.admission` in `src/content/site-shell.ts`
- [X] T055 [US5] Add `{ source: "/admission/class-levels", destination: "/admission", permanent: true }` with a comment (Class Levels is skipped until the client confirms it; a later feature restores it) in `next.config.ts`
- [X] T056 [US5] Delete `src/components/site-shell/anchored-sections.tsx` (its only consumer was the old `/admission` page; confirm with a grep for `AnchoredPage|AnchoredSection` that nothing else imports it)
- [X] T057 [US5] Grep the repo (excluding `node_modules`, `.next`, `history`, `specs`) for `class-levels`, `Class Levels` and `/admission/` links. Repoint any that target a removed section and list what was checked in `specs/020-admission/baseline.md` under "Links checked"
- [ ] T058 [US5] Run `npx vitest run src/content/site-shell.test.ts src/components/site-shell src/lib/site-search.test.ts` and `npx playwright test e2e/page-sections.spec.ts e2e/desktop-navigation.spec.ts e2e/mobile-navigation.spec.ts`; compare with the T001 baseline

**Checkpoint**: Navigation and redirects are final.

---

## Phase 8: User Story 6 — Apply button ready for registration (Priority: P3)

**Goal**: An "Apply Now" link below the procedure, shown only when `isAdmissionApplyOpen()` is true (window open AND registration form exists), so it stays hidden until 013.

**Independent Test**: With the shipped constant, no `admission-apply` element appears in any window state (E2E). With the constant mocked on, the button appears only while open (component/unit test).

### Tests for User Story 6 ⚠️

- [X] T059 [P] [US6] Write a component test in `src/components/admission/apply-button.test.tsx`: it renders one link named "Apply Now" with `href="/admission/register"` and the primary button classes
- [X] T060 [P] [US6] Write a page-level test in `src/app/(public)/admission/page.test.tsx` (mock `@/lib/admission/server`): when `isAdmissionApplyOpen` resolves `true`, exactly one `admission-apply` follows the procedure; when `false`, there is none and no placeholder text; the page reads apply visibility only from `isAdmissionApplyOpen` (assert the mock was called and `registrationFormExists` is not imported by the page or components: a static grep assertion over `src/app/(public)/admission` and `src/components/admission`)

### Implementation for User Story 6

- [X] T061 [P] [US6] Add `apply: { label: "Apply Now", href: "/admission/register" }` to `src/content/admission/page.ts`
- [X] T062 [US6] Create `src/components/admission/apply-button.tsx` (server): `next/link` with `data-testid="admission-apply"`, styled with the same classes as the careers CTA button in `src/components/home/careers-cta.tsx` (`bg-cta`, radius, padding, button font tokens, hover tokens, a focus-visible ring), placed in a centred row with existing spacing tokens
- [X] T063 [US6] In `src/app/(public)/admission/page.tsx` call `isAdmissionApplyOpen()` and pass `<ApplyButton />` into the `action` slot only when it is true (no `else`). T059, T060 and the "no apply" assertions in T037 must pass

**Checkpoint**: All stories are complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T064 [P] Document the `date` field type and the group `rules` in the Settings section of `docs/architecture.md`, and add a short "Admission window (020)" note (request-time page, Asia/Karachi days, `getAdmissionWindow`/`isAdmissionApplyOpen` for 013, the `e2e-now` test hook, ADR-0011)
- [X] T065 [P] Update `specs/005-settings/contracts/field-definitions.md` with a dated addendum listing the `date` type and `dateOrder` group rule (pointer to 020)
- [ ] T066 Run `npx tsc --noEmit`, `npm run lint` and `npx vitest run`; fix any issues caused by this feature (DB-backed tests need the test DB env per the project's test setup)
- [ ] T067 Run `npm run build` (nothing else running) and confirm the route table marks `/admission` as dynamic (`ƒ`) and `/admin/settings/admission` exists; record the line in `specs/020-admission/baseline.md`
- [ ] T068 After the build finishes, run the full feature E2E set from `specs/020-admission/quickstart.md` §4 plus `e2e/home-cards.spec.ts`, and compare every failure against the T001 baseline. Only failures already in the baseline may remain
- [ ] T069 Manual pass per `specs/020-admission/quickstart.md` §1–§3 and §5 at 375, 768, 1024 and 1440 px and the reference breakpoints 480, 640, 782, 1023, 1025 and 1280 px, including the screen-reader names of the cards and the banner
- [ ] T070 Write the completion report in `specs/020-admission/baseline.md`: the redirect mapping table (FR-003), the links checked (FR-004), the photo mapping and file sizes, the client review list, and the T001-vs-final test comparison
- [ ] T071 Compare /admission at 1440, 820 (iPad Pro) and 412 (Moto G Power) px with `screenshots/das.edu.pk_admission_*.png` and `screenshots/das.edu.pk_admission_uniform_*.png`; for each visible element record "matches" or the deviation ID (V1–V7 in spec.md "Deviations from the reference") in `specs/020-admission/baseline.md`; any difference not covered by V1–V7 is fixed or raised with the requester

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T001 needs the requester to commit or stash first.
- **Foundational (Phase 2)**: needs Setup. Blocks every story.
- **US1 (Phase 3)**: needs Foundational.
- **US2 (Phase 4)**: needs Foundational. Independent of US1.
- **US3 (Phase 5)**: needs Foundational and the US1 section component (T028), because the notice renders inside it. Data can be seeded without US2.
- **US4 (Phase 6)**: needs Foundational (page shell T023). Independent of US1–US3.
- **US5 (Phase 7)**: needs Foundational. Independent; best done before final E2E runs.
- **US6 (Phase 8)**: needs T028 (the action slot) and T019.
- **Polish (Phase 9)**: after all the stories you want shipped.

### User Story Dependencies

```text
Setup → Foundational ─┬─ US1 ──┬─ US3
                      │        └─ US6
                      ├─ US2
                      ├─ US4
                      └─ US5
```

### Within Each User Story

- Tests first, failing; then content, then components, then page wiring; then the story's run task.
- In US4, T045 → T046 → T047 (the home regression gate) must finish before T050.

### Parallel Opportunities

- Setup: T002, T003, T004, T005 together.
- Foundational tests: T006, T007, T008 together. T012, T013 and T016 can run beside T011. T020 can be written once T019's contract is fixed.
- After Foundational: US1, US2, US4 and US5 can run in parallel in separate files. US3 and US6 follow US1's T028.
- Do not parallelise `npm run build` with any Playwright task.

## Parallel Example: User Story 4

```text
# Together, before the coverflow refactor:
T043 uniform fidelity test (src/content/admission/fidelity.test.ts)
T044 uniform E2E spec (e2e/admission-uniform.spec.ts)
T048 uniform card tokens (research/design-tokens.md, src/app/globals.css)

# Then strictly in order:
T045 → T046 → T047 (home regression gate) → T049 → T050 → T051
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phases 1–2, then Phase 3 (US1): `/admission` shows the full procedure word for word.
2. Stop and validate: T029 green, axe clean.

### Incremental Delivery

1. US1: procedure (MVP)
2. US2: the admin can set the window (no public effect yet)
3. US3: parents see the banner, which switches at midnight
4. US4: uniform cards (behind the home regression gate)
5. US5: menu and redirects final
6. US6: Apply hook (hidden until 013)
7. Polish: docs, build route check, full regression vs baseline, report

### Parallel Team Strategy

After Foundational: developer A takes US1 → US3 → US6; developer B takes US4; developer C takes US2 and US5.

## Notes

- `[P]` = different files and no dependency on an unfinished task.
- Spec deviation: the plan named a single `e2e/admission.spec.ts`. Uniform behaviour gets its own `e2e/admission-uniform.spec.ts` to keep the files readable. Coverage is unchanged.
- Constitution XI for US6: the E2E test (T037) covers the hidden state in every window state; the shown state is covered by T059/T060 because `registrationFormExists` is a build-time constant. 013 adds the shown-state E2E when it removes the constant.
- Commit after each checkpoint only when the requester asks. On commit, end the message with the project's Co-Authored-By line.
- 013 follow-ups (not tasks here): delete `registrationFormExists`, build `/admission/register`, and call `getAdmissionWindow()` in the submit action.

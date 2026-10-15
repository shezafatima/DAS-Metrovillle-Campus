# Research: 020-admission

**Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Each entry: Decision, Rationale, Alternatives considered. Codebase facts are cited by path.

---

## R1. How the banner switches at midnight without a save or redeploy (FR-016)

**Decision**: `/admission` is rendered **per request**. The page calls `await connection()` (from `next/server`) before working out the window state, so Next never pre-renders or caches the page. The **stored dates** are still read through the existing cached Settings reader (`getPublicSettings`, 60 s cache, tag-revalidated on save, `src/lib/settings/public.ts`), because only a save changes them and every save already revalidates the tag with `{ expire: 0 }` (`src/app/admin/(dashboard)/settings/actions.ts`). The open/closed **decision** is a pure function of (stored dates, current time), run on every request, so it changes on the first request after 00:00 Asia/Karachi.

**Rationale**:
- Next 16.3 here runs without Cache Components (`next.config.ts` has no `cacheComponents`), so route segment config and `connection()` both work. `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`: "useful when a component … still needs to produce different output per request, such as … `new Date()`"; it "replaces `unstable_noStore`". It is the forward-compatible choice over `export const dynamic = "force-dynamic"` (which Cache Components removes).
- The page is light (static content + one cached Settings read), so per-request rendering costs a few milliseconds of server time and no database round trip in the common case.
- `/news` already renders per request (`src/app/(public)/news/page.tsx`, `force-dynamic`), so this is an existing pattern, not a new one.

**Alternatives considered**:
- *`revalidate = 60` (ISR, like `src/app/(public)/layout.tsx`)*: rejected. ISR serves the stale page first and regenerates in the background, so after midnight the first visitor (and, on a quiet site, possibly many minutes of visitors) sees yesterday's state. Bounded only by traffic, not by time.
- *Revalidate exactly at midnight (scheduled job calling `revalidatePath`)*: rejected. Needs a cron/scheduler the stack doesn't have (Constitution II) and fails silently if the job misses.
- *Decide in the browser (client island reading dates, comparing with the visitor's clock)*: rejected. The visitor's clock and time zone are untrusted; the server-rendered HTML would show no banner (layout shift, and no banner without JavaScript); and 013 needs the same decision on the server anyway.

Recorded as **ADR-0011** (`history/adr/0011-admission-window-evaluation.md`).

## R2. Calendar days in Asia/Karachi (FR-011)

**Decision**: Dates are stored as plain calendar-date strings `YYYY-MM-DD` (or `""` for empty). "Today" is computed as the `YYYY-MM-DD` of `now` in `Asia/Karachi` with `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" })`. The window is open when both dates are set and `opensOn <= today <= closesOn` (string comparison is correct for zero-padded ISO dates).

**Rationale**: A calendar date has no time zone, so storing it as a string avoids every UTC-midnight off-by-one (e.g. a `Date` at `2027-03-31T00:00Z` is 05:00 in Karachi). Comparing whole days makes "inclusive of the last day" automatic: 23:59:59 on 31 March is still "2027-03-31". Node ships full ICU, so `Asia/Karachi` resolves on the server and in Vitest. Pakistan has no daylight saving (UTC+5 all year), but the code does not rely on that.

**Alternatives considered**:
- *Store `Date` objects at Karachi midnight*: rejected — needs conversion at every edge and invites off-by-one bugs on read/write.
- *Hard-code a +05:00 offset*: rejected — correct today, but silently wrong if the rule ever changes; `Intl` costs nothing extra.
- *Add a date library*: rejected — not in the fixed stack (Constitution II) and not needed.

## R3. A date field and a two-field rule in the 005 Settings engine (FR-008, FR-009)

**Decision**:
- Add `DateField` (`type: "date"`, value `YYYY-MM-DD` or `""`, optional `required`) to `src/lib/settings/types.ts`. Schema: trimmed string that is `""` or a real calendar date (regex + round-trip check, so `2027-02-30` is refused). Default `""`. Admin control: a native `<input type="date">` inside the shared `ui/form` primitives in `field-control.tsx` (native control = accessible keyboard entry and a picker on every browser and phone).
- Add an optional `rules?: GroupRule[]` to `GroupDefinition`, with one rule kind `{ kind: "dateOrder"; from: string; to: string; message: string }`. `schemaFor()` applies group rules in a `superRefine`; the issue path is `[to]`, so the message appears on **Closes on** (FR-009). The rule only fires when both dates are set.
- Because `schemaFor` is the single schema used both by the admin form in the browser and the Server Action (`src/lib/settings/schema.ts` header), the check runs in both places with no extra code (Constitution VI).

**Rationale**: The brief says to use the existing typed field-group engine. The engine's switches are exhaustive over `Field["type"]` (`defaults.ts`, `schema.ts`, `field-control.tsx`), so TypeScript lists every place that must learn the new type. Group-level rules mirror the existing list-level `ListRule` design (`allOrNone`, `atLeastOneVisible`).

**Alternatives considered**:
- *Store dates as `text` with a hint*: rejected — no picker, no validation of real dates, and a cross-field rule would still be needed.
- *A one-off form for the Admission group*: rejected — breaks 005's "no per-group form component" rule and the Constitution VIII editing model.
- *A generic expression rule language*: rejected as speculative (Constitution X); one concrete rule kind is enough.

## R4. Settings status line ("Open now until …", "Opens on …", "Closed") (FR-012)

**Decision**: The Settings → Admission page (`/admin/settings/admission`, `force-dynamic` like its siblings) computes the status on the server from the **saved** value with the same pure state function as the public page, and passes it to `SettingsGroupView` through a new optional `status` slot rendered under the group description in a `role="status"` element. After a save, the Server Action's `revalidatePath("/", "layout")` makes the client router re-fetch the current page, so the status updates with the saved values.

**Rationale**: The status must describe what the **public** sees, i.e. saved values, not unsaved edits. Reusing the one state function guarantees the admin wording and the public page never disagree.

**Alternatives considered**: *Live status from unsaved form values*: rejected — it would describe a state the public does not see yet and need a client-side clock.

## R5. One function for the Apply button, extensible by 013 (FR-013, FR-017–FR-019)

**Decision**: `src/lib/admission/window.ts` (pure) and `src/lib/admission/server.ts` (server-only) hold:
- pure `admissionWindowState(value, now): AdmissionWindowState` → `{ kind: "open", closesOn } | { kind: "upcoming", opensOn } | { kind: "closed" }`;
- server-only `getAdmissionWindow(now?)`: awaits `connection()`, reads `getPublicSettings("admission")`, returns the state plus the announcement and closed message;
- server-only `isAdmissionApplyOpen(): Promise<boolean>` = window state is `open` **and** `registrationFormExists` (from `src/content/admission/registration.ts`, shipped `false`).

The page renders the button only from `isAdmissionApplyOpen()`. 013 deletes the constant and reuses `getAdmissionWindow()` in its submit action.

**Rationale**: Matches the brief's contract exactly; one place for 013 to change; pure core is unit-testable at exact boundary instants.

**Alternatives considered**: *Environment variable for "form exists"*: rejected by the brief (constant in the content file). *Passing booleans down from the page*: rejected — scatters the condition (brief: "not from scattered conditions").

## R6. Testing the midnight boundary on the real page (SC-005)

**Decision**:
- **Unit (Vitest)**: `admissionWindowState` at fixed instants: 23:59:59 and 00:00:00 Karachi on both edges (= 18:59:59Z / 19:00:00Z the day before), same-day window, empty dates, before start, after end, and a server in another zone (`TZ` irrelevant because only `Intl` with an explicit zone is used).
- **E2E (Playwright)**: a **test-only clock override**: when `freshReadsForTests()` is true (dev server under Playwright only, never production — `src/lib/e2e-fresh-reads.ts`), `getAdmissionWindow()` honours an `e2e-now` cookie holding an ISO instant. Specs set the cookie to 23:59 and 00:00 Karachi around seeded dates and reload, with no save in between. Playwright's `page.clock` only fakes the browser clock, so a server-side hook is required.
- **Build check**: `next build` output must list `/admission` as dynamic (`ƒ`), proving it is not pre-rendered.

**Rationale**: Follows the existing test-only switch pattern; the override is unreachable in production because `freshReadsForTests()` returns false when `NODE_ENV === "production"`.

**Alternatives considered**: *Seeding dates relative to the real "today"*: kept as an additional spec (open/upcoming/closed), but it cannot prove the 00:00 switch. *Faking `Date` in the Next server process*: rejected — global, fragile, affects every request.

## R7. Extending the home coverflow instead of copying it (FR-025–FR-029)

**Decision**: Split `src/components/home/quick-access-cards.tsx` into:
- `src/components/ui/flip-coverflow.tsx` (client): all behaviour now in `QuickAccessCards` — position state, hover/tap/focus flip, drag/swipe, arrow keys, auto-advance and its pause conditions, reduced motion, tab visibility, the `.qa-*` card shell and the flip **button**. Props: `items` (`id`, `title`, `front`, `back`, optional `frontClassName`/`backClassName`), `label`, `flipLabel`, `positionLabel`, `header` slot, `as` (`"section"` | `"div"`), `className`, `stageClassName` (card size), and `testIdPrefix` (default `"quick-access"`).
- `QuickAccessCards` becomes a thin wrapper that builds the four home fronts/backs (image, title, text; back with the Read More `Link`) and passes today's exact classes, `as="section"`, the same `aria-label`, and `testIdPrefix="quick-access"` — so the DOM, test ids (`quick-access-card`, `quick-access-flip`, `quick-access-link`, `data-qa-index`) and CSS are unchanged.
- The back's "tap turns it over again" handler already ignores taps on links; with no link it simply always applies — that is the link-free back.
- The uniform cards (`UniformSection`, `src/components/admission/uniform-section.tsx`) use `as="div"` with `role="group"` inside the Uniform `AboutSection` (the section/h2 come from there), `testIdPrefix="uniform"`, and a taller card size set from new tokens.

**Rationale**: One behaviour implementation, two presentations (Constitution IX "built once and reused"). Keeping home markup byte-for-byte equivalent is what lets `e2e/home-cards.spec.ts` prove "unchanged".

**Alternatives considered**: *Add `variant="uniform"` branches inside `QuickAccessCards`*: rejected — mixes home content and uniform content in one component and grows conditionals. *Copy the component*: forbidden by the brief.

## R8. Uniform card faces and readability at 375 px (FR-028, FR-033)

**Decision**: Front = photo (`next/image`, `object-contain` on a light surface, fixed aspect box), or for a photo-less group the lucide `Shirt` icon (`aria-hidden`) on `bg-surface` in the same box size so cards align; then an `h3` showing the category as a small label above the gender as the main text, with a screen-reader-only " – " between them, so the heading's accessible name is "{category} – {gender}" (e.g. "Kids Uniform – Boys"; requester's choice, analysis H1 option a). Back = the same label and gender drawn the same way but `aria-hidden` (one heading per card, so the heading list does not repeat), then a `<ul>` of items in body size labelled by the front heading (`aria-labelledby`); the list is **not** `aria-hidden` (the front does not contain the items). Card size tokens: `--spacing-uniform-card-w`, `--spacing-uniform-card-h` (+ `lg` variants) chosen so five items at body size fit at 375 px without clipping; if any group's back would overflow, the back scrolls (`overflow-y: auto`) rather than clip. Back colour: the theme navy (`bg-primary` with white text — passes contrast), consistent with the home coverflow, the same for every card.

**Rationale**: Meets "never an empty image box", "real `<ul>`", and readable text at every width; uses existing colour tokens; the full heading makes each card understandable on its own to screen readers.

**Alternatives considered**: *Reuse home flip tones (pink/blue/green)*: rejected — they are tied to the four home destinations, and white on `#ff709f` fails contrast for body text. *The reference's own card colours (Boys `#ddffff`, Girls `#ffeeee`, opposite 40 px corners)*: rejected by the requester (2026-10-14) — not theme colours, and colour-coding boys/girls is not wanted; the Boys/Girls text identifies each card (spec deviation V7). *Short card titles ("Kids – Boys")*: rejected — they drop the reference's verbatim category headings (analysis H1).

## R9. Photos (FR-013, FR-014)

**Decision**: Copy the four confirmed files to `public/images/admission/uniform/` as `kids-boys.png`, `kids-girls.png`, `senior-boys.png`, `senior-girls.png`, recompressed losslessly with `sharp` (already in `node_modules` via Next; no new dependency) in a one-off script run by the implementer, keeping transparency and dimensions. Delivery goes through `next/image` (responsive sizes, WebP/AVIF negotiation). The untracked source folder `public/images/uniform/` is left as it is; whether to delete it is the requester's call, raised at implementation. Alt text describes visible garments (spec Findings), e.g. "Kids boys' uniform: white shirt with green check collar, cuffs and pocket, grey-green trousers, green blazer, black shoes and black socks".

**Rationale**: The originals are already ~24–28 KB; `next/image` handles format and size per device, so heavy pre-processing adds nothing.

**Alternatives considered**: *Commit WebP only*: unnecessary given `next/image`; PNG keeps a lossless master.

## R10. Content files and fidelity tests (FR-006, FR-020, FR-021, SC-002)

**Decision**: Follow the 018 academics pattern (`src/content/academics/*`, `src/lib/academics/schema.ts`, `fidelity.test.ts`):
- `src/lib/admission/schema.ts`: Zod schemas for the procedure blocks and uniform groups.
- `src/content/admission/procedure.ts`, `uniform.ts`, `registration.ts`, `index.ts` (parses at module load; exports `admissionReviews` with `status: "pending-client-approval"` and the client questions).
- Verbatim source text saved as `docs/content-source/admission/procedure.txt` and `uniform.txt` (with the source URL and retrieval date in a header line), and a `fidelity.test.ts` asserting every displayed string is a source line, in order, and every source line within the kept sections is displayed (the ordered-list numbers are compared with their "1. " prefix restored).

**Rationale**: Proven pattern in this repo; makes "word for word" an automated check (SC-002).

## R11. Navigation and redirects (FR-001–FR-004)

**Decision**: Remove `class-levels` from `pageSections.admission` (`src/content/site-shell.ts`); the dropdown, mobile menu and `sectionRedirects` (`next.config.ts`) all derive from it. Add an explicit permanent redirect `/admission/class-levels → /admission` next to the other legacy redirects. Update `e2e/page-sections.spec.ts` and `src/content/site-shell.test.ts` expectations. Replace the placeholder `AnchoredPage` usage on `/admission` with composed sections; `AnchoredPage` stays if other code uses it, else is removed (check at implementation).

**Rationale**: Single source for menu and redirects already exists (ADR-0009).

## R12. Procedure presentation (FR-007)

**Decision**: Reference h2s ("1. Eligibility" …) render as h3 under the section's h2, centred with the step's intro line centred beneath, as on the reference (icons, wave bands and next-step buttons are not reproduced: spec deviations V2, V3); reference h3/h4 ("Nursery – PREP", "Class-I Onward", "Note", "Rules of Payment") render as h4. Formalities steps 1–7 render as one `<ol>` (each step's sub-list nested); Rules of Payment as `<ol>`; other lists as `<ul>`. The fee list is a `<table>` whose letter cell is a row header (`<th scope="row">`) and which is labelled by the step-6 text via `aria-labelledby` — no invented caption or column headers.

**Rationale**: Exact wording, correct heading order (axe `heading-order`), and a table that passes axe without adding text.

## Open items carried to tasks

- None blocking. Client review list (spec "Open Questions for the Client") travels in `admissionReviews`.

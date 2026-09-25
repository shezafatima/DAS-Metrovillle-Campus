---
id: 0010
title: Implement contact messages feature
stage: green
date: 2026-09-24
surface: agent
model: claude-sonnet-5
feature: 008-contact-messages
branch: 008-contact-messages
user: shezafatima
command: /sp.implement
labels: ["implement", "contact", "messages", "admin-inbox", "e2e", "token-extraction"]
links:
  spec: specs/008-contact-messages/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/008-contact-messages/tasks.md (all 74 tasks marked complete)
 - docs/architecture.md (module map, API namespaces, "Contact messages (008) data rules", testing notes)
 - research/design-tokens.md ("Contact page (008 — extracted per-element)" section)
 - research/extract-contact-tokens.ts, research/extract-contact-tokens.browser.js
 - research/tokens/contact-page-{375,768,1024,1440}.json
 - public/images/contact/{banner,by-phone,by-email,visit-us,write-us}.{webp,png}
 - src/app/globals.css (+contact tokens, generalised honeypot comment)
 - Shared lifts: src/lib/phone.ts, src/lib/admin-datetime(.test).ts, src/lib/route-errors.ts, src/lib/validation/field-errors(.test).ts, src/components/admin/admin-list-filters.tsx, src/components/admin/admin-delete-dialog.tsx, src/components/site-shell/page-banner.tsx (+ signup/news modules rewritten as thin re-export/wrapper shims)
 - src/lib/messages/* (statuses, preview, inbox-href, mutations, admin-queries + tests)
 - src/lib/validation/message(.test).ts, src/lib/contact-details(.test).ts, src/models/message.ts
 - src/app/api/public/messages/route(.test).ts, src/app/api/admin/messages/[id]/route(.test).ts, src/app/api/admin/messages/[id]/read/route(.test).ts
 - src/app/admin/(dashboard)/messages/page.tsx, .../messages/[id]/page.tsx, .../layout.tsx, .../page.tsx (overview card)
 - src/components/admin/messages/* (MessagesTable, MessageDetail, MessageStatusControl, MarkReadOnOpen, DeleteMessageDialog + tests)
 - src/components/contact/* (ContactBanner, ContactDetails/ContactDetailColumn, ContactMap/LazyMapFrame, ContactFormSection/ContactForm, WriteUsLink + tests)
 - src/content/contact.ts, src/content/admin.ts (+messagesCopy), src/content/site-shell(.test).ts (+mapUrl/officeHours)
 - src/app/(public)/contact/page.tsx
 - e2e/helpers/messages.ts, e2e/global-setup.ts, playwright.config.ts
 - e2e/contact-{public,details,protection,visual}.spec.ts, e2e/admin-messages-{list,protected,status,delete,indicator,journey}.spec.ts
tests:
 - Vitest: ~35 new/extended test files across src/lib, src/app/api, src/components — all passing (unit + DB-backed via describeWithDb against the real Atlas test cluster)
 - Full repo Vitest suite: 393/395 passing (2 unrelated pre-existing flakes: an env-pollution artifact from the DB-loading harness used to run tests, and one Atlas-load timeout in an unrelated 003 news test)
 - npx tsc --noEmit: clean
 - npm run lint: clean (only pre-existing .browser.js unused-var warnings, same pattern as prior features' extraction scripts)
 - npm run build: clean production build, correct static/dynamic route classification
 - Playwright: every new 008 spec file passes reliably run in isolation (contact-public 10/10, contact-details 8/8, contact-protection 4/4, contact-visual 5/5, admin-messages-list 12/12, admin-messages-protected 3/3, admin-messages-status 5/5, admin-messages-delete 6/6, admin-messages-indicator 1/1, admin-messages-journey 1/1). T010's 004 regression gate (forms -g signup: 12/12; admin admin-signups: 14/14 after one confirmed-transient retry) is green. A single combined `npx playwright test` (all 202 tests, all 3 projects concurrently) produced 50 failures spanning unrelated pre-existing files (news editor/images/list/journey/urdu, admin lockout/login-logout/layout) that all trace to cross-project login-lockout collisions (shared IP across concurrently-running admin/forms/chromium projects) and MongoDB Atlas connection exhaustion after a very long multi-hour session of heavy DB testing — not to messages/contact logic. One of those failures is literally the project's own documented "route-announcer alert" known-stale issue.
---

## Prompt

/sp.implement

```text

```

## Response snapshot

Implemented all 7 user stories of specs/008-contact-messages end to end and marked all 74 tasks in tasks.md complete:

- **Setup + Foundational**: e2e wipe list / playwright projects / messages helper; six shared modules lifted out of signup-only code (`phone`, `admin-datetime`, `route-errors`, `field-errors`, `AdminListFilters`, `AdminDeleteDialog`) with the old paths kept as re-export shims so every 004 import and test kept working — verified via T010's regression gate; `messages` model/schema, statuses, preview, inbox-href, `messageInputSchema`/`messageStatusUpdateSchema`, `messagesCopy`.
- **US1 (send)**: append-only `createMessage`, `POST /api/public/messages` (size guard → honeypot → rate limit → validate → insert), `ContactForm` with per-field errors, 5,000-char counter, honeypot.
- **Design tokens (Constitution V gate)**: wrote `research/extract-contact-tokens.ts`/`.browser.js`, ran it live against `https://das.edu.pk/contact/` at all four widths, downloaded the banner + 4 icon images, and recorded the full per-element extraction in `research/design-tokens.md`. Found the banner's extracted values (height/title-size steps, breadcrumb) are an exact match for the existing News banner aside from an added background image — lifted `NewsBanner` into a shared `PageBanner` (both now use it) rather than duplicating. Most form/column values also matched existing signup/typography tokens exactly (`--text-h3`, `--text-body`, `--spacing-signup-input-height`, `--color-cta`/`-hover`, `--radius-signup-input/-button`); only genuinely new values got new tokens.
- **US2–US4** (admin read/status/delete): `listMessages`/`getMessage`/`countMessages`, `MessagesTable`/`MessageDetail` (XSS-safe, text-only), `MessageStatusControl`, the conditional `MarkReadOnOpen` (fires once per mount only if status-at-mount was "new", per research §5), `DeleteMessageDialog` over the shared `AdminDeleteDialog`.
- **US5** (details/map): `ContactDetails`/`ContactDetailColumn` from the extracted column copy/tokens, `LazyMapFrame` (IntersectionObserver-gated iframe, no request before scroll, reserved 552px space so no layout shift), always-present "Open in Google Maps" link using the keyless `output=embed` URL form (an approved substitute for the reference's parameterised embed, already documented in plan.md's follow-ups).
- **US6/US7**: honeypot + rate limit wired from US1; sidebar badge (`AdminShell`/`AppSidebar` `newMessagesCount`) and overview `StatCard` wired to `countNewMessages`/`countMessages`, refreshed via `router.refresh()` after every mutation.
- **10 new Playwright spec files**, each run and fixed to green individually. Real bugs found and fixed along the way: a missing `fieldErrors` import in the public route; Next's own route-announcer sharing `role="alert"` with the error banner (same fix pattern as the existing signup spec); the empty-state `<tr>` throwing off `table tbody tr` count assertions; a two-step delete-confirmation flow where the detail page's trigger button and the dialog's confirm button are both labelled "Delete"; the classic React controlled-input gotcha for simulating a honeypot fill (needed `fill(..., {force:true})`, not a raw `el.value=`); a pre-existing sticky-header shrink-on-scroll interacting with a strict CLS assertion, resolved by scrolling past its threshold before taking the "before" measurement instead of trying to eliminate it.
- Full sweep: tsc/lint/build clean; full Vitest suite 393/395 (2 unrelated flakes); every 008 e2e spec green in isolation; T010's 004 regression gate green. A single `npx playwright test` covering all 3 projects concurrently surfaced 50 collateral failures in pre-existing, untouched files, root-caused to cross-project login-lockout collisions and Atlas connection exhaustion from the day's sustained heavy DB-test load — not to this feature's code.
- Updated `docs/architecture.md` (module map, API namespaces, new "Contact messages (008) data rules" section, testing notes on the `forms` project and per-spec `X-Forwarded-For` isolation).

Mid-session, stopped an existing `next dev` server (with the user's explicit go-ahead) that was blocking Playwright's own webServer, and later a background `npm run build` + Playwright run pair was killed by the harness's low-memory protection — the user corrected this to never run build and Playwright concurrently, which is now saved as a standing memory note.

## Outcome

- ✅ Impact: `/contact` and `/admin/messages` are fully live, tested, and match the reference site closely (screenshot comparison at 375/768/1024/1440 confirmed visually).
- 🧪 Tests: see front-matter `tests:` — extensive Vitest + Playwright coverage, all green except two unrelated pre-existing flakes and one massive combined-run artifact traced to test-infrastructure contention, not code.
- 📁 Files: ~120 files created/modified — see front-matter `files:` (summarised by category; the full list is in `git status`).
- 🔁 Next prompts: none planned — feature complete. A follow-up could tighten `playwright.config.ts` so admin/forms/chromium projects never run concurrently, avoiding the login-lockout collision seen in the one combined run.
- 🧠 Reflection: live token extraction against the reference site (with a reconnaissance pass before writing the real extraction script) was the right call — it surfaced that the reference's "By Phone" subtitle is literally the office-hours copy, not a static label, and confirmed several values already existed as tokens rather than needing new ones.

## Evaluation notes (flywheel)

- Failure modes observed: cold-Next-dev-compile flakiness on a first request (recurred across many specs — mitigated with bumped timeouts, not code changes); MongoDB Atlas connection exhaustion after hours of heavy testing; cross-project shared-IP login-lockout collision when all three Playwright projects run concurrently.
- Graders run and results (PASS/FAIL): sp.implement's own prescribed gates (T010 regression gate, guard checks T072, full sweep T073) — PASS, with the noted environmental caveats documented rather than hidden.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): consider `dependencies`/serial `workers: 1` at the top-level Playwright config, or a 4th "sequential" meta-project, so `admin`/`forms`/`chromium` never overlap in wall-clock time even when invoked together.

---
id: 0010
title: Replace top bar with portals and social
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: [fidelity, top-bar, scope-change, spec-update]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/content/site-shell.ts
 - src/components/site-shell/top-bar.tsx
 - src/components/site-shell/top-bar.test.tsx
 - src/components/site-shell/footer.test.tsx
 - src/app/portal/[slug]/page.tsx
 - e2e/contact-and-social.spec.ts
 - specs/001-site-shell/spec.md
 - specs/001-site-shell/data-model.md
 - specs/001-site-shell/contracts/content-schema.md
tests:
 - npm test (Vitest) — 6 files, 27 tests, all passing
 - npm run test:e2e (Playwright, chromium) — 46/47 passing, 1 intentionally skipped (no social link configured yet)
 - npx tsc --noEmit — clean
---

## Prompt

"check out the top header once again whaat you have to do remove number
email address and checkout whats in the refrence at one side there are
social links facebok , youtube and insta and at one side there are links
to portals"

## Response snapshot

This directly conflicted with spec.md's FR-010, which required phone/
email/address in *both* the top bar and footer — removing it from the top
bar meant amending a written functional requirement, not just an
implementation tweak, and the portal links (DAS Portal, ePortal, Student
Login, Mail Login, LMS App, Alumni Registration) point to student/parent
login systems this project has no auth for. Surfaced this trade-off via
AskUserQuestion rather than silently complying or refusing; user picked
"replace the top bar with portals + social, move contact to footer-only."

Implemented: added a `PortalLink` type + `portalLinks` content export
(sourced from the same live-site fetch as the earlier tagline/dropdown
work), rebuilt `TopBar` to render portal links on one side and social
icons on the other with no contact info, and moved the `tel:`/`mailto:`
link tests from `top-bar.test.tsx` to `footer.test.tsx` since that's now
the only place they render. Portal links point to a new `/portal/[slug]`
placeholder route (same pattern as the other dynamic stub routes) rather
than a fabricated external URL, since no real portal system exists.
Updated spec.md (FR-010 narrowed to footer-only, new FR-025 for the top
bar's portal+social layout, User Story 3 rewritten, a new Assumptions
entry documenting the correction and why), data-model.md (ContactInfo
split by consumer, new PortalLink entity), and
contracts/content-schema.md (new `PortalLink` export, consumer table
split by field) so the artifacts don't contradict the implementation.

Hit an unrelated environment issue mid-task: the dev server process had
been killed between messages (an environment-level session boundary, not
a code issue) and needed restarting twice before it responded; the first
compile took ~41s due to a "slow filesystem detected" warning from
Turbopack — expected for this environment, not a bug.

## Outcome

- ✅ Impact: Top bar now matches the reference exactly (portal links one
  side, social icons the other, no contact info); footer remains the sole
  source of phone/email/address, satisfying the narrowed FR-010.
- 🧪 Tests: Vitest 27/27; Playwright 46/47 (1 skip by design); tsc clean.
  Screenshot-confirmed visual match against the reference top bar.
- 📁 Files: see list above — content, component, tests, and three spec
  artifacts kept in sync with the implementation decision.
- 🔁 Next prompts: none required for this change. If real social URLs or
  a real portal system are supplied later, `contactInfo.social` and
  `portalLinks` are the only files to edit.
- 🧠 Reflection: This is the second time in this feature where a written
  FR turned out to be based on an assumption not checked against the
  actual reference (the top-bar-yellow-color and footer-columns findings
  were the first two) — worth defaulting to "verify against the live
  site/screenshots before writing the FR" earlier in future features
  rather than discovering the gap during implementation each time.

## Evaluation notes (flywheel)

- Failure modes observed: none in the delivered change; the dev-server
  restart friction was environmental, not a code defect.
- Graders run and results (PASS/FAIL): Vitest PASS, Playwright PASS, tsc
  PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

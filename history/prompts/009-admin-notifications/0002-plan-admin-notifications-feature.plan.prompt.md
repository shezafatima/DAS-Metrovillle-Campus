---
id: 0002
title: Plan admin notifications feature
stage: plan
date: 2026-09-26
surface: agent
model: claude-sonnet-5
feature: 009-admin-notifications
branch: 009-admin-notifications
user: s2636309@gmail.com
command: /sp.plan
labels: [admin, notifications, plan, adr]
links:
  spec: specs/009-admin-notifications/spec.md
  ticket: null
  adr: history/adr/0002-admin-notifications-live-state-and-shared-popover.md
  pr: null
files:
  - specs/009-admin-notifications/plan.md
  - specs/009-admin-notifications/research.md
  - specs/009-admin-notifications/data-model.md
  - specs/009-admin-notifications/contracts/admin-notifications-api.md
  - specs/009-admin-notifications/contracts/notification-ui.md
  - specs/009-admin-notifications/quickstart.md
  - history/adr/0002-admin-notifications-live-state-and-shared-popover.md
tests:
  - none (plan stage; no tests run or added)
---

## Prompt

/sp.plan

(no additional arguments — the command's own outline instructs running
`.specify/scripts/powershell/setup-plan.ps1 -Json`, loading
`spec.md` and the constitution, then executing the Phase 0/Phase 1
planning workflow against the 009-admin-notifications feature already
created by the prior `/sp.specify` run.)

## Response snapshot

Ran `setup-plan.ps1 -Json`, which copied the plan template to
`specs/009-admin-notifications/plan.md`. Before filling it in, read
008-contact-messages' plan/research/data-model (for the established
project conventions — Technical Context depth, Constitution Check
table shape, `router.refresh()`-after-mutation freshness pattern,
`countNewMessages()`/sidebar-badge/Overview-card wiring already built),
004-signup's data model (`lastSignupAt` updates on every accepted
submission, including a repeat one — the mechanism that makes "counts
as new again" fall out for free), and 002-foundation's data model (the
Better-Auth-owned `user` collection with exactly one admin today, and
the rule that app code never writes to Better-Auth-owned collections —
which ruled out storing "last opened Signups" there). Also read the
live sidebar/top-bar/overview/session code (`app-sidebar.tsx`,
`admin-top-bar.tsx`, `admin-shell.tsx`, dashboard `layout.tsx`,
`dal.ts`, `stat-card.tsx`, the messages `[id]`/`[id]/read` routes) and
confirmed `@base-ui/react/popover` already ships in the installed
dependency (no Popover/Dropdown primitive existed yet in
`src/components/ui`) — grounding every design decision in what
actually exists rather than assumed conventions.

Produced: `research.md` (10 decisions — per-admin "last opened"
state defaulting to *now* not the epoch; the combined
messages+signups "new" query and merge; client-side polling via a
single `NotificationsProvider` context, no new dependency; a new
shared `Popover` primitive plus a purely-responsive-width panel
instead of a second mobile-only overlay; sidebar/bell reading one
shared context instead of duplicate props; Overview computed
server-side at render time from the same query functions rather than
client-polled; two new small formatters, `formatCount`/
`formatRelativeTime`; the page-title prefix mechanism; reused
`requireAdminSession` access control; no new dependencies).
`data-model.md` (one new collection, `adminNotificationStates`, keyed
by admin id; `AdminSession` gains `userId`; reused `Message`/`Signup`
fields and indexes, no schema changes to either). Two contracts
(`admin-notifications-api.md`, `notification-ui.md`) and
`quickstart.md`. Filled `plan.md`'s Technical Context, an 8-row
Constitution Check (all PASS, two judgment calls documented in the
post-design re-check), a full Project Structure source tree (new vs.
modified files), 9 implementation phases, and 3 follow-ups/risks. Ran
`update-agent-context.ps1 -AgentType claude`, which found no insertion
markers in this project's custom `CLAUDE.md` and only rewrote it with a
stray BOM — reverted that no-op change with `git checkout -- CLAUDE.md`
to keep the diff clean.

Asked the user whether the plan's three related, cross-cutting
decisions (new shared Popover primitive; client-poll-with-
visibility-pause as the live-data pattern; lazy last-opened-defaults-
to-now bootstrapping) warranted an ADR per the constitution's
significance test; the user said yes. Ran `/sp.adr`, which found no
`create-adr.sh`/`.ps1` script in this project (only the template
exists), so created **ADR-0002**
(`history/adr/0002-admin-notifications-live-state-and-shared-popover.md`)
agent-natively, following ADR-0001's structure and depth: one context
paragraph, three decision bullets, positive/negative consequences for
each, and nine alternatives-considered entries (grouped by cluster),
cross-referenced to research.md/plan.md/data-model.md/contracts and
noting the (non-conflicting) relationship to ADR-0001.

## Outcome

- ✅ Impact: `specs/009-admin-notifications/{plan.md, research.md,
  data-model.md, quickstart.md, contracts/*}` and
  `history/adr/0002-admin-notifications-live-state-and-shared-popover.md`
  are ready for `/sp.tasks`.
- 🧪 Tests: None run or added at this stage; the plan's Technical
  Context and each contract enumerate the Vitest/Playwright coverage
  `/sp.tasks` must schedule (401 matrix for all three new routes, DB
  tests for the lazy-default and repeat-submission-counts-again edge
  cases, four-width + expanded/collapsed visual coverage).
- 📁 Files: 6 new spec artifacts, 1 new ADR (listed above); no source
  code changed yet (implementation starts at `/sp.tasks` →
  `/sp.implement`).
- 🔁 Next prompts: `/sp.tasks` for 009-admin-notifications.
- 🧠 Reflection: The most consequential judgment call was rejecting the
  literal epoch-default reading of "since the admin last opened the
  Signups page" in favour of defaulting to *now* on first use —
  justified by the spec's own edge-case emphasis on not flooding false
  "new" signals (deleted records never counted, failed loads keep the
  previous value), which reads as a general design intent, not just a
  rule for those two specific cases. Recording it in an ADR (rather
  than only in research.md) makes that reasoning discoverable the next
  time someone adds a second "new since X" feature and is tempted to
  reach for the epoch by default.

## Evaluation notes (flywheel)

- Failure modes observed: None. Checked for over-granular ADR
  candidates (e.g. a separate ADR just for adding `@base-ui/react/popover`)
  and folded them into the one cluster instead, per the ADR skill's
  significance/clustering guidance.
- Graders run and results (PASS/FAIL): Manual checklist against the ADR
  skill's grader — PASS on all four items (clusters related changes;
  lists alternatives with rationale for each cluster; pros/cons for
  chosen approach and alternatives; concise but detailed).
- Prompt variant (if applicable): N/A.
- Next experiment (smallest change to try): N/A.

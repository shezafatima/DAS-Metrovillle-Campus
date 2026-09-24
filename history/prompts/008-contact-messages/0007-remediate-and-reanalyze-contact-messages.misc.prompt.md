---
id: 0007
title: Remediate and reanalyze contact messages
stage: misc
date: 2026-09-24
surface: agent
model: claude-opus-5-5
feature: 008-contact-messages
branch: 008-contact-messages
user: shezafatima
command: remediation + /sp.analyze
labels: ["analyze", "remediation", "lazy-map", "layout-shift", "contact"]
links:
  spec: specs/008-contact-messages/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/008-contact-messages/spec.md
 - specs/008-contact-messages/plan.md
 - specs/008-contact-messages/research.md
 - specs/008-contact-messages/data-model.md
 - specs/008-contact-messages/tasks.md
 - specs/008-contact-messages/contracts/contact-page.md
 - specs/008-contact-messages/quickstart.md
 - history/prompts/008-contact-messages/0007-remediate-and-reanalyze-contact-messages.misc.prompt.md
tests:
 - none (artifact edits and read-only re-analysis)
---

## Prompt

A. No deviation needed for item 5, and keep items 1-4 as approved.
Google Maps embed is approved as part of item 3. Apply those and all
the analysis fixes you listed, then re-run /sp.analyze and show me
the result.

 , Load the map only when it scrolls into view, and reserve its space
so nothing jumps as it loads.

## Response snapshot

**Decisions recorded**
- Item 5 follows the reference; items 1–4 stay approved; the Google Maps embed is approved as part of item 3.
- These are recorded in Clarifications, in Deviations (item 5 marked "not a deviation"), and in plan checks I and II.

**Lazy map**
- Added FR-024a (no map request until the map scrolls into view; space reserved from the first render), US5 scenario 7 and SC-012.
- Added a client `LazyMapFrame` that uses an `IntersectionObserver` inside a fixed-height area. Research §13 explains why native `loading="lazy"` alone is not enough.
- Updated the contract, plan, quickstart and tasks: T059 builds it, T061 tests 7–8 check lazy loading and layout shift, T069 checks the reserved height, and T072 adds a guard check.

**Analysis fixes applied**
- I1: the Playwright patterns list the new spec names explicitly.
- U1: `MessageStatusControl` gets `key={status}`, with a jsdom test.
- U2: `test.use` placed at describe level.
- I2: `throttles` everywhere.
- A1: the phone link uses the stored value, matching the footer.
- G1: an SC-007 timing test added to T033.
- A2: the preview uses `min-w-0 truncate`.
- I3: "six" helpers everywhere, and a row added to the research table.
- D1: US6 points to FR-006.
- U3: a last-write-wins DB test.
- U4: accessibility assertions added to T028.
- C3: 1023/1025 breakpoint checks added to T069.

**Re-analysis**
- 0 CRITICAL, 1 HIGH, 1 MEDIUM, 3 LOW.
- H1 (HIGH): in T048, `MarkReadOnOpen` is rendered only when the status is `new`, so setting a message back to New would remount it and immediately mark it read again. That contradicts spec US3 scenario 4 and would fail T049 test 4 and T068 test 3.
- M1 (MEDIUM): T061 test 8 sums buffered layout shifts from page load, not only those caused by the map, so unrelated shifts (fonts, images) could fail it.
- L1–L3: the viewport precondition in T061 test 7, the unencoded `from` value in T054 test 4, and the unnamed background token for the reserved map area.
- Coverage is 33 of 33 functional requirements and 12 of 12 success criteria.

## Outcome

- ✅ Impact: The constitution gate is closed. All earlier findings are fixed. One new high-severity logic bug was found before implementation.
- 🧪 Tests: none run.
- 📁 Files: spec, plan, research, data-model, tasks, contact-page contract, quickstart.
- 🔁 Next prompts: approve the fixes for H1 and M1 (and optionally L1–L3), then /sp.implement.
- 🧠 Reflection: The U1 fix, which keys the status control on the status, made it more obvious that `MarkReadOnOpen`'s conditional mount has the same kind of bug. Both depend on how React remounts components after `router.refresh()`.

## Evaluation notes (flywheel)

- Failure modes observed: a bash heredoc containing backticks failed to parse, so the script was moved into a scratchpad Python file. A Python string escape wrote a literal `\`` into the contract, which was fixed.
- Graders run and results (PASS/FAIL): format check PASS (74 of 74 tasks); story labels PASS; constitution gate PASS.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

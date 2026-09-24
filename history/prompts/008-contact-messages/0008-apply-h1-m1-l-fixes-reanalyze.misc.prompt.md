---
id: 0008
title: Apply H1 M1 L fixes and reanalyze
stage: misc
date: 2026-09-24
surface: agent
model: claude-opus-5-5
feature: 008-contact-messages
branch: 008-contact-messages
user: shezafatima
command: remediation + /sp.analyze
labels: ["analyze", "remediation", "mark-read", "layout-shift", "contact"]
links:
  spec: specs/008-contact-messages/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/008-contact-messages/tasks.md
 - specs/008-contact-messages/research.md
 - specs/008-contact-messages/contracts/admin-messages-api.md
 - specs/008-contact-messages/contracts/contact-page.md
 - history/prompts/008-contact-messages/0008-apply-h1-m1-l-fixes-reanalyze.misc.prompt.md
tests:
 - none (artifact edits and read-only re-analysis)
---

## Prompt

Yes, apply H1, M1 and L1-L3. Then re-run /sp.analyze and show me the
result before implementing.

## Response snapshot

**Fixes applied**
- H1: `MarkReadOnOpen` is always rendered with `key={id}` and receives the status. It records the status at mount and posts once, only if that status was `new`. `router.refresh()` keeps it mounted, so setting a message back to New does not re-trigger it. A jsdom test file was added to T046, and research §5 and the admin contract were updated to match.
- M1: the T061 layout-shift test no longer uses buffered entries. It waits for fonts and network idle, then measures only between the start of the scroll and the iframe's `load` event, and ignores shifts caused by user input.
- L1: T061 test 7 now checks first that the map starts below the visible screen, and fails with an explicit message if not.
- L2: T054 test 4 uses an encoded `from` value on inbox page 2.
- L3: the reserved map area uses `bg-surface` (the existing `color-surface` #FFFFFF, the same blank white area as in the reference captures). The contract was updated.

**Re-analysis**
- 0 CRITICAL, 0 HIGH, 0 MEDIUM, 2 LOW.
  - L4: T054 says "more than 20" seeded messages. With exactly 21, page 2 is empty after the delete. Seed 25.
  - L5 (informational): a browser Back/Forward return may restore the detail page with its component state kept, so it doesn't auto-read again. This is acceptable under the spec.
- Coverage: 33 of 33 functional requirements, 12 of 12 success criteria. 74 tasks, all correctly formatted and labelled. The constitution check passes.

## Outcome

- ✅ Impact: No blocking findings; ready for /sp.implement.
- 🧪 Tests: none run.
- 📁 Files: tasks.md, research.md, both contracts.
- 🔁 Next prompts: optionally fix L4, then /sp.implement.
- 🧠 Reflection: Every fix was checked against the tasks that depend on it: T049 test 4 and T068 test 3 now match the H1 behaviour.

## Evaluation notes (flywheel)

- Failure modes observed: the L2 fix introduced a small ambiguity of its own (L4). It was reported rather than silently fixed during the read-only pass.
- Graders run and results (PASS/FAIL): format PASS (74/74); story labels PASS; constitution PASS; coverage PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none

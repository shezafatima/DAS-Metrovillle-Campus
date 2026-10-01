---
id: 0006
title: Analyze settings artifacts
stage: misc
date: 2026-09-30
surface: agent
model: claude-opus-5-5
feature: 005-settings
branch: 005-settings
user: shezafatima
command: /sp.analyze
labels: ["settings", "analyze", "consistency", "caching"]
links:
  spec: specs/005-settings/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - history/prompts/005-settings/0006-analyze-settings-artifacts.misc.prompt.md
tests:
 - none (read-only analysis)
---

## Prompt

/sp.analyze (no arguments)

## Response snapshot

Read-only cross-artifact analysis of spec.md, plan.md and tasks.md (plus research, data-model and contracts) against the constitution. 0 CRITICAL, 3 HIGH, 5 MEDIUM, 3 LOW. All 35 FRs and 9 SCs have at least one task (100%).
HIGH:
- I1: the spec's US2 independent test and SC-002 say the new phone appears in the footer, but the footer shows only social icons; the phone is on the Contact page only.
- U1: the plan uses `updateTag` on `unstable_cache` tags. The Next 16.3.5 docs tie `updateTag` to `cacheTag`/fetch tags and point the previous caching model to `revalidateTag`/`revalidatePath`. Recommend `revalidateTag(tag, { expire: 0 })` + `revalidatePath("/", "layout")`.
- C1: T053 expects a PDF renamed `photo.jpg` to be rejected in E2E, but the browser pre-check uses `file.type`, which follows the extension, and uploads are stubbed. Recommend a magic-byte sniff in `precheckImage`.
MEDIUM:
- U2: a failed read could be cached as defaults, depending on where the fallback sits relative to `unstable_cache`.
- D1: the field-definitions contract lacks the list options that the tasks add.
- G1: US3 scenarios 9–10, US5 scenario 3 and FR-025's mobile image depend on 006 and can't be verified in 005.
- I2: "Header" vs "top bar" drift.
- I3: `officeHours` vs "office timings".
LOW: a duplicate edge case, a reference to the memory baseline in tasks, and the orphaned-upload note.

## Outcome

- ✅ Impact: 3 HIGH issues to fix before /sp.implement; no constitution violations
- 🧪 Tests: none
- 📁 Files: none modified (read-only)
- 🔁 Next prompts: approve remediation edits, then /sp.implement
- 🧠 Reflection: checking the Next docs on updateTag vs unstable_cache found a real design error; checking footer.tsx found an untestable spec criterion

## Evaluation notes (flywheel)

- Failure modes observed: the plan relied on an API whose documented scope didn't cover its usage
- Graders run and results (PASS/FAIL): coverage 100%, constitution PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

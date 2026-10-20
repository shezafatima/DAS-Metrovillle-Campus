---
id: 0008
title: Apply analyze remediation edits
stage: misc
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 018-academics
branch: 018-academics
user: shezafatima
command: (follow-up to /sp.analyze)
labels: ["analyze", "remediation", "csp", "instagram", "academics"]
links:
  spec: specs/018-academics/spec.md
  ticket: null
  adr: history/adr/0010-shared-click-to-load-video-block.md
  pr: null
files:
 - specs/018-academics/spec.md
 - specs/018-academics/plan.md
 - specs/018-academics/contracts/page-structure.md
 - specs/018-academics/tasks.md
 - docs/architecture.md
tests:
 - none
---

## Prompt

yes, apply all of them

## Response snapshot

Applied all 12 remediation edits from 0007:
- spec.md: F1 (the build fails on an invalid video URL or a 4th photo, and the renderer still hides a bad URL as a second guard), F2 (FR-003 restore path), I1 (FR-013 line-length cap), I3 (photo order is its list position).
- plan.md: added src/lib/content/placeholders.ts (I4).
- contracts/page-structure.md: added the `one` media seam (C2).
- tasks.md:
  - U1: a ground rule to read the Next.js docs before API work.
  - I4: T009 moves showPlaceholders.
  - C1: T030 checks anchors at 4 widths.
  - B1: T026/T027 use gap-10 and testid wrappers.
  - B2/C2: concrete fixture URLs and a `one` fixture in T043.
  - I2: T044 uses view.* names.
  - C2/C3: T049 adds dev mode and a single-photo case.
  - C4: T042 verifies the doc; T060 confirms the Instagram hosts.
- docs/architecture.md (CRLF kept): replaced "YouTubeEmbed facade" and added the src/components/media/ VideoEmbed entry, with click-only loading, the YouTube/Instagram hosts and the CSP note.

Deviations from the proposal:
- The media-host line says "to be confirmed in T060", not "confirmed".
- Because the doc entry is now written ahead, T042's doc step became "check the entry matches the built code".

## Outcome

- ✅ Impact: All /sp.analyze findings are resolved in the artifacts. There are still 60 tasks.
- 🧪 Tests: none (documentation only)
- 📁 Files: spec.md, plan.md, contracts/page-structure.md, tasks.md, docs/architecture.md
- 🔁 Next prompts: /sp.implement
- 🧠 Reflection: Documenting VideoEmbed before it exists needs a check-back step (T042), and the unverified hosts need a confirm step (T060).

## Evaluation notes (flywheel)

- Failure modes observed: none. The CRLF doc was edited with a scratchpad .cjs script per project memory.
- Graders run and results (PASS/FAIL): 60 tasks with valid format PASS; no placeholders left PASS; architecture.md still CRLF PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

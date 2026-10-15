---
id: 29
title: Admission implementation
stage: green
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 020-admission
branch: 020-admission
user: shezafatima
command: /sp.implement
labels: ["admission", "implementation", "settings-engine", "coverflow", "admission-window"]
links:
  spec: specs/020-admission/spec.md
  ticket: null
  adr: history/adr/0011-admission-window-evaluation.md
  pr: null
files:
 - src/lib/settings/{types,schema,defaults,public,registry}.ts, src/lib/settings/groups/admission.ts
 - src/lib/admission/{schema,window,server}.ts (+ window.test.ts, server.test.ts)
 - src/content/admission/{page,procedure,uniform,registration,index}.ts (+ fidelity.test.ts)
 - src/content/admin.ts, src/content/site-shell.ts, next.config.ts
 - src/components/ui/flip-coverflow.tsx, src/components/home/quick-access-cards.tsx
 - src/components/admission/* (procedure, blocks, window notice, apply button, uniform section + tests)
 - src/components/admin/settings/{field-control,settings-group-view,settings-nav}.tsx
 - src/app/(public)/admission/page.tsx (+ page.test.tsx), src/app/admin/(dashboard)/settings/admission/page.tsx
 - src/app/globals.css, research/design-tokens.md, docs/architecture.md, docs/content-source/admission/*
 - public/images/admission/uniform/*.png
 - e2e/admission.spec.ts, e2e/admission-window.spec.ts, e2e/admission-uniform.spec.ts, e2e/admin-settings-admission.spec.ts, e2e/page-sections.spec.ts, e2e/admin-settings-access.spec.ts, e2e/helpers/settings.ts
 - deleted src/components/site-shell/anchored-sections.tsx
tests:
 - tsc --noEmit (pass); eslint touched files (pass)
 - vitest non-DB suites for settings, admission, components, page, site-shell (pass)
 - vitest DB settings/actions.test.ts 30/30 (pass)
 - Playwright: written, not run (test server not confirmed)
---

## Prompt

/sp.implement (no arguments). During the run the requester answered:
- Pending edits: "Commit on 020-news (Recommended)"
- E2E server: "first implement this spec "
- "remove the girls hifz uniform card"
- "hifz uniform is added but white shalwar kameez is not visibling on white card"

## Response snapshot

Committed the 020-news edits on their branch (f89c911) and fast-forwarded 020-admission. Implemented the following:
- The Settings engine date field and dateOrder rule, plus the admission group with its status line.
- The pure Asia/Karachi window module and the request-time `getAdmissionWindow` / `isAdmissionApplyOpen` (with a test-only e2e-now cookie).
- Verbatim procedure and uniform content, with fidelity tests against the saved source text.
- The procedure section with centred step headings, an ordered list of steps and the fee table.
- The window banner and quiet note, and Apply Now behind the single function.
- FlipCoverflow extracted from the home cards, with the home quick-links HTML identical before and after; the uniform section with full card headings and navy backs.
- Class Levels removed and redirected; tokens and docs updated.

Per the requester, the Hifz girls' card was removed (spec V8). A requester-supplied Hifz boys' photo was added, and every photo now sits on a grey panel (`--color-home-flip-front`) so white clothes are visible; the photo's mismatch with the list was flagged for the client.

## Outcome

- ✅ Impact: Feature implemented; 54 tasks done; Playwright runs, the build check and the screenshot comparison are still pending
- 🧪 Tests: tsc, lint, unit/component/page tests, and DB action tests pass; E2E written but not run
- 📁 Files: see list
- 🔁 Next prompts: start the Playwright dev server with the test env, then run T001 baseline → T029/T036/T042/T047/T051/T058 → build (T067) → T068–T071
- 🧠 Reflection: server components cannot pass functions to client components, so FlipCoverflow takes per-item label strings

## Evaluation notes (flywheel)

- Failure modes observed: first dev fetch after edits returned stale output; refetch confirmed
- Graders run and results (PASS/FAIL): fidelity tests PASS; home quick-links HTML diff identical PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

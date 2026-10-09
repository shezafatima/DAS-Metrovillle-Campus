---
id: 0008
title: I1 spike, remediation and re-analysis
stage: misc
date: 2026-09-28
surface: agent
model: claude-opus-5-5
feature: 010-admin-account
branch: 010-admin-account
user: shezafatima
command: remediation + /sp.analyze
labels: ["admin", "account", "spike", "next-cookies", "dal", "analysis"]
links:
  spec: specs/010-admin-account/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/010-admin-account/spec.md
 - specs/010-admin-account/plan.md
 - specs/010-admin-account/research.md
 - specs/010-admin-account/data-model.md
 - specs/010-admin-account/contracts/account-actions.md
 - specs/010-admin-account/tasks.md
tests:
 - I1 spike (throwaway Next page + Server Action, Playwright driver on port 3200; files deleted afterwards)
---

## Prompt

Yes, apply the fixes for C1, I1, I2, I3, I4 and U1, plus the MEDIUM
and LOW items in the same pass. Run the I1 spike first and report
what it found before changing getAdminSession, since that touches
002 and every admin route depends on it. Then re-run /sp.analyze
and show me the result.

(Follow-up answer: patch getAdminSession.)

## Response snapshot

**Spike.**
- Next 16.3.5 source shows that a cookie write in a Server Action forces a re-render in the same response.
- `synchronizeMutableCookies` then updates `cookies()` but not `headers()`.
- Measured: `headers()` returned OLD while `cookies()` and the browser had NEW.
- So the 002 `getAdminSession()` would treat the admin as logged out right after `changePassword`.
- The user chose to patch the DAL.

**Fixes applied.**
- C1: spec "Constitution Exceptions" section.
- I1: `getAuthRequestHeaders()` in `dal.ts` (T011), a regression gate (T012), research §13, plan decision 7 and risk 4, and a no-reload assertion in the US1 E2E.
- I2: session-free `getPasswordChangedAt` (T009, src/lib/account.ts).
- I3: FR-010 success-clears-count sentence.
- I4: `revalidatePath` removed.
- U1: `changed_signed_out` copy.
- G1: Space key test.
- G2: double-submit test.
- G3: SC-001 manual timing.
- A1: T024 wording.
- D1: "setup command" terminology.
- D2: Admin entity wording.
- D3: FR-008 128-character maximum.
- D4: T039 uses the Grep tool.
- Tasks were renumbered from T011 onward to 41 tasks.

**Re-analysis.** 0 CRITICAL, 0 HIGH, 1 MEDIUM (T012 has no captured pre-change baseline), 2 LOW. Coverage is 21/21 FRs and 8/8 SCs.

## Outcome

- ✅ Impact: US1-breaking session bug caught and designed out before implementation; artifacts consistent
- 🧪 Tests: spike run (empirical confirmation); no project tests run
- 📁 Files: 6 spec artifacts updated; spike files created and deleted
- 🔁 Next prompts: optionally fix the MEDIUM baseline item, then /sp.implement
- 🧠 Reflection: The spike turned an "unverified risk" into a measured fact, and changed the fix from avoiding revalidatePath (which wouldn't have worked) to fixing the session read.

## Evaluation notes (flywheel)

- Failure modes observed: The first spike run timed out at 30s on the first compile (slow filesystem warning); it passed after raising the timeout.
- Graders run and results (PASS/FAIL): task format 41/41 PASS; sequential IDs PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

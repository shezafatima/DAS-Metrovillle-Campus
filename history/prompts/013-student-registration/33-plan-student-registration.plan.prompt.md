---
id: 33
title: Plan student registration
stage: plan
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 013-student-registration
branch: 013-student-registration
user: shezafatima
command: /sp.plan
labels: ["plan", "student-registration", "personal-data", "health-data", "main-admin-only", "retention"]
links:
  spec: specs/013-student-registration/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/013-student-registration/plan.md
 - specs/013-student-registration/research.md
 - specs/013-student-registration/data-model.md
 - specs/013-student-registration/quickstart.md
 - specs/013-student-registration/contracts/public-registration-api.md
 - specs/013-student-registration/contracts/admin-registrations-api.md
 - specs/013-student-registration/contracts/registration-page.md
 - specs/013-student-registration/contracts/settings-admission-classes.md
 - specs/013-student-registration/contracts/access-matrix-delta.md
 - history/prompts/013-student-registration/33-plan-student-registration.plan.prompt.md
tests:
 - none (planning stage)
---

## Prompt

/sp.plan (no additional input)

## Response snapshot

Read the careers route/retention/admin queries/model/validation, 020 admission window + server + settings group, Settings list schema and editor, notifications queries/types, DAL, access inventory and matrix tests, soft-delete plugin, CSV helper, release gate and env. Wrote plan.md (Technical Context, Constitution Check all PASS, structure, implementation order, risks), research.md (18 decisions), data-model.md, quickstart.md and five contracts. Key decisions:
- JSON public route with closed-window 403 before validation.
- "Registration open" = window open AND class list non-empty, via `getRegistrationAvailability()`; `registrationFormExists` deleted.
- Schema factory `buildRegistrationSchema({ classes, today })`.
- 8-character random reference (unique index + retry).
- Read-time duplicate flag over a hashed `duplicateKey`.
- Embedded status/delete/restore history.
- 30-day Deleted view and restore via conditional single-document writes.
- Sweep triggered from the route, the register page and the admin pages (hourly throttle) plus a script.
- `registrationExports` collection without search text.
- `requireAdminPageOr404` for content managers; new inventory `page404` kind.
- Main-admin-only notification kind with reference + class only.
- Settings list gains a `uniqueText` rule (no new field type, no field-type ADR).
- Release gate and REGISTRATION_RETENTION_MONTHS.
- Shared public-form styles for the serif error-text check.

## Outcome

- ✅ Impact: Plan and design artifacts are ready for /sp.adr and /sp.tasks.
- 🧪 Tests: none run (planning).
- 📁 Files: 9 spec artifacts + this PHR.
- 🔁 Next prompts: /sp.adr registration-write-rule-and-encryption; /sp.tasks.
- 🧠 Reflection: The careers sweep only fires on submissions; registrations would stall between windows, so page-visit triggers were added.

## Evaluation notes (flywheel)

- Failure modes observed: update-agent-context.ps1 reported success but made no visible change to CLAUDE.md.
- Graders run and results (PASS/FAIL): Constitution Check — PASS (pre and post design).
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

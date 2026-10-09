---
id: 0002
title: Amend constitution — roles, personal data, content
stage: constitution
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: none
branch: 009-admin-notifications
user: s2636309@gmail.com
command: /sp.constitution
labels: ["constitution", "governance", "roles-access", "personal-data", "security"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - .specify/memory/constitution.md
tests:
 - (none — documentation-only change)
---

## Prompt

the constitutions have some update

[User then pasted the following full draft constitution text after being asked what specifically changed:]

Constitution — Dar-e-Arqam Metroville Campus Website

Version 1.1

1. Purpose & Fidelity

Public website + admin dashboard for a real client. das.edu.pk is the visual/structural reference. The design MUST be reproduced as-is (exact values, not approximations) unless a spec documents a deviation.

Sources: research/design-tokens.md (values), screenshots/ (layout), live site (animation behavior only).
Conflicts between sources are flagged and asked about, never resolved silently.
Scope comes from docs/prd.md; anything else needs client approval.

2. Fixed Stack

Next.js (App Router) + TypeScript strict, Tailwind v4, shadcn/ui, Motion, MongoDB Atlas + Mongoose, Zod, Better Auth, Cloudinary for public media, a private object store for documents, Playwright + Vitest. Versions and wiring: docs/architecture.md. No new frameworks, databases or providers, and no major-version upgrades, without amending this document.

3. Roles & Access
Two roles: main admin (full access) and content manager (only the sections the main admin has granted).
Student registrations and user management are main-admin only.
Permission is checked on the server for every admin page, route and action. Hiding menu items is presentation, never protection.
Public sign-up stays disabled; accounts exist only because the main admin or the seed script created them.
New accounts start with a temporary password that must be changed at first login.
Permission and account changes are recorded with who and when.

4. Security
Passwords are hashed; secrets live only in environment variables.
Public form endpoints are rate-limited and spam-protected.
The seed script runs manually only, never from build, deploy, postinstall or startup code.

5. Personal Data
Uploaded documents (CVs) and personal records (registrations, applications, enquiries) are never reachable by public URL and are never served from the public media service.
Documents are stored privately with unguessable keys and reach a permitted user only through a route that checks their session and role, delivered as a download rather than displayed in the panel.
Uploads are accepted only after verifying the file's actual content, type and size.
Forms collecting personal data show a privacy notice approved by the client, and collect only fields the client has confirmed are needed.
Personal records are deleted after the retention period agreed with the client.

6. Data Integrity
Server-side validation is mandatory; the client reuses the same schema.
Deletes are soft by default unless a spec requires a confirmed hard delete.
Where a spec says a person may have only one record, that rule is enforced by the database, not by checking first.
No email notifications in this phase.

7. Design System
Every design value comes from research/design-tokens.md and is used through a named token. No raw values in components.
Missing values are extracted and added to the token file first, never guessed.

8. Content
Content the client edits lives in the database, defined as typed field groups with a fixed layout: fields can be edited, sections cannot be added, removed or reordered.
Content the client does not edit lives in typed content files in the same shape, so it can be moved to the database without changing components.
Saved changes appear on the live site without a redeploy.

9. Components
Every visual section is its own component; pages only compose.
Server Components by default; client code only where interaction or animation needs it.
Shared UI and motion helpers are built once and reused.

10. Extensibility

The API and data model must not assume this website is their only consumer (a separate chatbot service is planned). Don't build speculative features.

11. Testing & Definition of Done

A feature is done only when:

it matches its spec, reference screenshots and token values;
it works at 375, 768, 1024 and 1440px and at the reference site's breakpoints;
every user story has a passing end-to-end test;
every admin route has passing tests for no session, wrong role and correct role;
it violates nothing in this document.

12. Governance

This constitution overrides specs, plans and tasks. Changes need an explicit amendment with a version bump. A spec that must break a rule says so and gets approval first.

## Response snapshot

Updated `.specify/memory/constitution.md` from 1.1.0 → 1.2.0 (MINOR bump: additive/tightening changes only, nothing loosened).

Before writing, flagged one discrepancy per Principle I's own "conflicts must be asked about, never resolved silently" rule: the user's draft Fixed Stack list omitted `react-icons`, which is already shipped in production (site-shell social icons, per `history/prompts/001-site-shell/0019-swap-social-icons-to-react-icons.green.prompt.md`). Asked the user; they chose to keep it in the stack list.

Changes applied:
- New Principle III "Roles & Access" (main admin vs. content manager, server-side enforcement, temp-password onboarding, audit trail for permission/account changes) — all subsequent principles renumbered IV–XI.
- New Principle V "Personal Data" (private-only storage/delivery for documents and personal records, upload content verification, client-approved privacy notices, retention-based deletion).
- Principle II "Fixed Stack" amended: Cloudinary scoped to public media only; added a private object store for documents; react-icons retained per user decision.
- Principle VI "Data Integrity" (formerly IV) amended: single-record-per-person uniqueness now required to be DB-enforced, not check-then-insert.
- New Principle VIII "Content" (DB-editable typed field groups with fixed layout vs. static typed content files, no-redeploy publishing).
- Principle XI "Testing & Definition of Done" (formerly VIII) amended: admin route test requirement expanded to a three-case matrix (no session / wrong role / correct role).
- Sync Impact Report (amendment 3) prepended documenting version bump rationale, full renumbering map, and one follow-up TODO (docs/architecture.md should be updated to describe the private object store once a document-upload feature is actually built — not edited now since no such feature exists yet).

Verified dependent templates (`plan-template.md`, `spec-template.md`, `tasks-template.md`) and `.claude/commands/sp.*.md` contain no hardcoded principle names/numbers — no edits required there.

## Outcome

- ✅ Impact: Constitution amended to v1.2.0; governs all future specs/plans/tasks, especially any admin-role or document-upload feature work.
- 🧪 Tests: none (documentation-only change)
- 📁 Files: `.specify/memory/constitution.md`
- 🔁 Next prompts: When a document-upload (CV) feature is planned, update `docs/architecture.md` to name the chosen private object store and its wiring, per the Sync Impact Report's follow-up TODO.
- 🧠 Reflection: The user's draft used its own "Version 1.1" label, which was a draft-doc label, not the actual semver target — resolved by computing the real bump (1.1.0 → 1.2.0) from the existing ratified constitution rather than trusting the pasted label.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a (documentation change)
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

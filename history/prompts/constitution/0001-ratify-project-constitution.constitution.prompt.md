---
id: 0001
title: Ratify project constitution
stage: constitution
date: 2026-09-16
surface: agent
model: claude-sonnet-5
feature: none
branch: master
user: shezafatima
command: /sp.constitution
labels: ["constitution", "governance", "initial-ratification"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - .specify/memory/constitution.md
 - history/prompts/constitution/0001-ratify-project-constitution.constitution.prompt.md
tests:
 - none (documentation-only change; no automated tests apply)
---

## Prompt

# Constitution — Dar-e-Arqam Metroville Campus Website

## 1. Purpose & Fidelity
Public website + admin dashboard for a real client. das.edu.pk is the
visual/structural reference. The design MUST be reproduced as-is
(exact values, not approximations) unless a spec documents a
deviation.
- Sources: research/design-tokens.md (values), screenshots/ (layout),
  live site (animation behavior only).
- Conflicts between sources are flagged and asked about, never
  resolved silently.
- Scope comes from docs/prd.md; anything else needs client approval.

## 2. Fixed Stack
Next.js (App Router) + TypeScript strict, Tailwind v4, shadcn/ui,
Motion, MongoDB Atlas Flex + Mongoose, Zod, Better Auth, Cloudinary,
Playwright + Vitest. Versions and wiring: docs/architecture.md. No new frameworks, databases or providers, and
no major-version upgrades, without amending this document.

## 3. Security
- Only the seeded admin can log in; public sign-up is disabled.
- Every admin API route verifies the session on the server.
- Passwords are hashed; secrets live only in environment variables.
- Public form endpoints are rate-limited and spam-protected.

## 4. Data Integrity
- Server-side validation is mandatory; the client reuses the same
  schema.
- Deletes are soft by default unless a spec requires a confirmed
  hard delete.
- Records keyed by a natural identifier (e.g. email) are upserted,
  never duplicated.
- No email notifications in this phase.

## 5. Design System
- Every design value comes from research/design-tokens.md and is used
  through a named token. No raw values in components.
- Missing values are extracted and added to the token file first,
  never guessed.

## 6. Components
- Every visual section is its own component; pages only compose.
- Server Components by default; client code only where interaction
  or animation needs it.
- Shared UI and motion helpers are built once and reused.
- Page copy lives in content files, not in components.

## 7. Extensibility
The API and data model must not assume this website is their only
consumer (a separate chatbot service is planned). Don't build
speculative features.

## 8. Testing & Definition of Done
A feature is done only when:
- it matches its spec, reference screenshots and token values;
- it works at 375, 768, 1024 and 1440px and at the reference
  site's breakpoints;
- every user story has a passing e2e test, and every admin route
  has a passing unauthorized-access test;
- it violates nothing in this document.

## 9. Governance
This constitution overrides specs, plans and tasks. Changes need an
explicit amendment with a version bump. A spec that must break a
rule says so and gets approval first.

## Response snapshot

Loaded the placeholder `.specify/memory/constitution.md` template and replaced
it with a concrete v1.0.0 constitution for the Dar-e-Arqam Metroville Campus
Website project. Mapped the user's 9 input sections to 8 Core Principles
(Purpose & Fidelity, Fixed Stack, Security, Data Integrity, Design System,
Components, Extensibility, Testing & Definition of Done) plus a Governance
section covering amendment procedure, semantic-versioning policy, and
compliance review expectations. Added a rationale line to each principle.
Prepended a Sync Impact Report as an HTML comment documenting the version
bump (template → 1.0.0, initial ratification), added sections, and template
consistency checks. Verified `.specify/templates/plan-template.md`,
`spec-template.md`, `tasks-template.md`, and the `.claude/commands/sp.*.md`
command files contain no hardcoded principle names or stale agent-specific
references requiring edits — all are generic and remain compatible.
Ratification and last-amended date set to 2026-09-16 (today), since no prior
ratified version existed.

## Outcome

- ✅ Impact: Project now has a concrete, versioned constitution (v1.0.0) governing fidelity to das.edu.pk, the fixed tech stack, security, data integrity, design tokens, component structure, extensibility, and definition of done.
- 🧪 Tests: None run — documentation-only change with no executable surface.
- 📁 Files: Created/overwrote `.specify/memory/constitution.md`; created this PHR at `history/prompts/constitution/0001-ratify-project-constitution.constitution.prompt.md`.
- 🔁 Next prompts: Author `docs/prd.md` (referenced by Principle I but not yet present) and `research/design-tokens.md` (referenced by Principle I and V but not yet present) so the principles that depend on them are checkable.
- 🧠 Reflection: The user's input already grouped cleanly into principle-shaped sections with their own rationale implicit in the wording; the main judgment call was folding "Governance" (input section 9) into the template's dedicated Governance section rather than treating it as a ninth principle, and noting missing referenced files (prd.md, design-tokens.md) as a visible follow-up rather than a blocking TODO token.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): N/A — no automated grader configured for constitution ratification.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a

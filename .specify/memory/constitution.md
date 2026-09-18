<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (initial ratification)
- Modified principles: n/a (first concrete version; template placeholders replaced)
- Added sections:
  - I. Purpose & Fidelity
  - II. Fixed Stack
  - III. Security
  - IV. Data Integrity
  - V. Design System
  - VI. Components
  - VII. Extensibility
  - VIII. Testing & Definition of Done
  - Governance (amendment procedure, versioning policy, compliance review)
- Removed sections: generic template placeholders ([SECTION_2_NAME], [SECTION_3_NAME]) —
  not used; all substantive content is captured as principles above.
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check gate is generic
    ("[Gates determined based on constitution file]"); no principle names are
    hardcoded, so no edit required. Verified compatible.
  - ✅ .specify/templates/spec-template.md — generic, no constitution-specific
    references; no edit required. Verified compatible.
  - ✅ .specify/templates/tasks-template.md — generic, no constitution-specific
    references; no edit required. Verified compatible.
  - ✅ .claude/commands/sp.*.md — no outdated agent-specific or stale principle
    references found (grep for "CLAUDE"/"agent-specific"/"GUIDANCE_FILE" only
    matched this constitution file itself and update-agent-context.ps1, which
    is generic tooling). No edit required.
- Follow-up TODOs:
  - research/design-tokens.md, docs/prd.md, and history/prompts/ do not exist
    yet in the repository. They are referenced normatively (as required
    sources/locations) and must be created before the principles that depend
    on them (Purpose & Fidelity, Design System) can be verified in practice.
    No TODO token left in this document — this is tracked here for visibility.
-->

<!--
Sync Impact Report (amendment 2)
- Version change: 1.0.0 → 1.1.0
- Modified principles:
  - II. Fixed Stack — added `react-icons` to the enumerated stack (real
    brand/social icons for the site shell's social links; previously
    omitted, which had forced a workaround using generic lucide-react
    glyphs instead of actual brand marks).
- Added sections: none
- Removed sections: none
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — no edit required.
  - ✅ .specify/templates/spec-template.md — no edit required.
  - ✅ .specify/templates/tasks-template.md — no edit required.
  - ✅ .claude/commands/sp.*.md — no edit required.
- Follow-up TODOs: none
-->

# Dar-e-Arqam Metroville Campus Website Constitution

## Core Principles

### I. Purpose & Fidelity

This is a public website and admin dashboard for a real client. `das.edu.pk`
is the visual and structural reference and MUST be reproduced as-is — exact
values, not approximations — unless a spec explicitly documents a deviation.

- Sources of truth, in order of what they govern: `research/design-tokens.md`
  (values), `screenshots/` (layout), the live reference site (animation
  behavior only).
- Conflicts between sources MUST be flagged and asked about; they are never
  resolved silently by guessing which source wins.
- Scope comes from `docs/prd.md`. Anything outside that scope requires
  explicit client approval before work begins.

**Rationale**: The client is paying for a specific, known design and a
specific, known scope. Silent approximation or silent scope expansion erodes
trust and creates rework; flagging ambiguity up front is cheaper than
reverting built features.

### II. Fixed Stack

The technology stack is fixed: Next.js (App Router) with TypeScript strict,
Tailwind v4, shadcn/ui, react-icons, Motion, MongoDB Atlas Flex with
Mongoose, Zod, Better Auth, Cloudinary, and Playwright with Vitest. Exact
versions and how these pieces wire together are recorded in
`docs/architecture.md`.

- No new frameworks, databases, or service providers may be introduced.
- No major-version upgrades of the fixed stack may be performed.
- Either change requires amending this constitution first.

**Rationale**: A small, fixed stack keeps the codebase learnable and
maintainable by a small team and avoids integration risk on a client project
with a fixed budget. Any stack change is an architectural decision, not an
implementation detail, and must go through governance.

### III. Security

- Only the seeded admin account may log in; public sign-up MUST be disabled.
- Every admin API route MUST verify the session on the server; the client
  never determines who is authorized.
- Passwords MUST be hashed; secrets MUST live only in environment variables,
  never in code or version control.
- Public form endpoints MUST be rate-limited and spam-protected.

**Rationale**: This is a single-admin institutional site handling public
submissions (admissions, contact forms). The attack surface is small and
known, so these controls are non-negotiable baseline hygiene rather than
aspirational goals.

### IV. Data Integrity

- Server-side validation is mandatory; the client reuses the same schema so
  validation rules cannot drift between layers.
- Deletes are soft by default (a `deletedAt` marker) unless a spec requires a
  confirmed hard delete.
- Records keyed by a natural identifier (e.g. email) MUST be upserted, never
  duplicated.
- No email notifications are sent in this phase.

**Rationale**: Shared Zod schemas prevent client/server validation skew.
Soft deletes protect against accidental data loss for a client with no
dedicated ops team to recover from mistakes. Natural-key upserts keep contact
and admission records deduplicated without added identity-resolution logic.

### V. Design System

Every design value MUST come from `research/design-tokens.md` and MUST be
consumed through a named token — no raw values (colors, spacing, type sizes,
etc.) in components.

- If a value is missing, it is extracted and added to the token file first.
  It is never guessed or approximated inline.

**Rationale**: Enforces Principle I (exact-fidelity reproduction) at the
implementation level and keeps the design consistent and centrally
updatable as more sections are built.

### VI. Components

- Every visual section is its own component; pages only compose components,
  they do not contain section-level markup directly.
- Server Components are the default; client code is used only where
  interaction or animation requires it.
- Shared UI primitives and motion helpers are built once and reused, not
  duplicated per section.
- Page copy lives in content files, not hardcoded inside components.

**Rationale**: Keeps the component tree aligned with the page's visual
structure (traceable back to screenshots), minimizes client-side JavaScript
by defaulting to Server Components, and lets copy be edited without touching
component code.

### VII. Extensibility

The API and data model MUST NOT assume this website is their only consumer —
a separate chatbot service is planned against the same data. At the same
time, speculative features built ahead of an actual second consumer are not
to be built.

**Rationale**: Balances two failure modes: designing the data model so
narrowly that a known future consumer requires a rewrite, versus over-
engineering for consumers that don't exist yet. The constraint is "don't
paint into a corner," not "build for hypothetical requirements."

### VIII. Testing & Definition of Done

A feature is done only when all of the following hold:

- It matches its spec, its reference screenshots, and the token values in
  `research/design-tokens.md`.
- It works correctly at 375px, 768px, 1024px, and 1440px, and at the
  reference site's own breakpoints.
- Every user story has a passing end-to-end test, and every admin route has
  a passing unauthorized-access test.
- It violates nothing in this constitution.

**Rationale**: These are the checkpoints that make "matches the client's
real site" and "is secure" verifiable facts rather than claims. A feature
that hasn't been checked against all four is not shippable, regardless of
how it looks in isolation.

## Governance

This constitution overrides specs, plans, and tasks. Where a spec must break
a rule in this document, the spec MUST say so explicitly and obtain approval
before implementation proceeds.

**Amendment procedure**: Amendments are proposed as an explicit diff to this
file (not silent drift in a spec or plan), reviewed against the versioning
policy below, and require the client/project owner's approval before being
merged. Every amendment updates the Sync Impact Report at the top of this
file and the version/date line below.

**Versioning policy**: This constitution is versioned independently using
semantic versioning:
- **MAJOR** — a principle is removed or redefined in a backward-incompatible
  way (e.g. loosening a security or fidelity guarantee).
- **MINOR** — a new principle or section is added, or existing guidance is
  materially expanded.
- **PATCH** — clarifications, wording fixes, and non-semantic refinements.

**Compliance review**: Every spec, plan, and set of tasks is checked against
this document before implementation starts (constitution check) and again
before a feature is marked done (Principle VIII). Any violation found during
either check is either fixed or escalated for an explicit, approved
exception — it is never silently waived.

**Version**: 1.1.0 | **Ratified**: 2026-09-16 | **Last Amended**: 2026-09-17

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

<!--
Sync Impact Report (amendment 3)
- Version change: 1.1.0 → 1.2.0
- Modified principles:
  - II. Fixed Stack — Cloudinary's role narrowed to public media only; added
    a private object store for documents (CVs, personal-record attachments).
    react-icons retained (already shipped for social icons; user's draft
    omission was confirmed unintentional and corrected before merge).
  - IV. Data Integrity — added: where a spec says a person may have only one
    record, that uniqueness is enforced at the database level, not by an
    application-level check-then-insert.
  - VIII. Testing & Definition of Done — admin route test requirement
    expanded from a single unauthorized-access test to a three-case matrix:
    no session, wrong role, correct role (reflects new role model in
    Principle III).
- Added sections:
  - III. Roles & Access — two roles (main admin, content manager), scoped
    permissions, server-side enforcement, temporary-password onboarding,
    audit trail for permission/account changes. (Renumbers former III–VIII
    to IV–XI.)
  - V. Personal Data — private-only storage and delivery for uploaded
    documents and personal records, content/type/size verification on
    upload, client-approved privacy notices, retention-based deletion.
  - VIII. Content — split of client-editable content (typed field groups in
    the database, fixed layout) from non-editable content (typed content
    files, same shape), with live updates requiring no redeploy.
- Removed sections: none (all prior principles retained; some renumbered —
  see mapping below)
- Principle renumbering (old → new):
  - I. Purpose & Fidelity → I. Purpose & Fidelity (unchanged)
  - II. Fixed Stack → II. Fixed Stack (unchanged, content amended)
  - III. Security → IV. Security (unchanged content; III is new)
  - IV. Data Integrity → VI. Data Integrity (content amended)
  - V. Design System → VII. Design System (unchanged)
  - VI. Components → IX. Components (unchanged)
  - VII. Extensibility → X. Extensibility (unchanged)
  - VIII. Testing & Definition of Done → XI. Testing & Definition of Done
    (content amended)
- Version bump rationale: MINOR (1.1.0 → 1.2.0) per the versioning policy
  below — three new principles added (Roles & Access, Personal Data,
  Content) and existing guidance materially expanded (data integrity,
  testing DoD). No existing guarantee was loosened or removed; all changes
  are additive or tightening, so MAJOR does not apply.
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check gate is
    generic ("[Gates determined based on constitution file]"); no principle
    names or numbers are hardcoded. No edit required. Verified compatible.
  - ✅ .specify/templates/spec-template.md — generic; no edit required.
  - ✅ .specify/templates/tasks-template.md — generic; no edit required.
  - ✅ .claude/commands/sp.*.md — no hardcoded principle names/numbers found.
    No edit required.
  - ⚠ docs/architecture.md — describes Cloudinary as the destination for all
    admin uploads generally; now that Principle II scopes Cloudinary to
    public media only and requires a private object store for documents,
    this doc should be updated when the document-upload feature (private
    object store) is actually implemented. Not edited here since no such
    feature exists yet in the codebase — tracked as a follow-up, not a
    blocking inconsistency today.
- Follow-up TODOs:
  - docs/architecture.md: document the private object store choice and its
    wiring once a feature requiring document uploads (e.g. CVs) is planned.
-->

<!--
Sync Impact Report (amendment 4)
- Version change: 1.2.0 → 2.0.0
- Modified principles:
  - III. Roles & Access — the rule "new accounts start with a temporary
    password that MUST be changed at first login" is REPLACED by: the main
    admin controls every password. A content manager's password is set by
    the main admin (typed or generated in the user panel) and only the main
    admin can change it; a content manager has no way to change their own.
    A main admin changes their own password on the Account page. The
    forced first-login change, the "temporary" password state and the
    7-day expiry are removed.
- Added sections: none
- Removed sections: none
- Version bump rationale: MAJOR (1.2.0 → 2.0.0) per the versioning policy —
  a stated guarantee (mandatory first-login password rotation) is removed
  and redefined. Directed and approved by the project owner on 2026-09-30
  ("the main admin should control every password"). The change also
  tightens another guarantee: a content manager can no longer change any
  password, including their own.
- Consequences accepted with this amendment: the main admin knows each
  content manager's working password until they reset it, and a content
  manager cannot rotate their own password after a suspected leak; both are
  answered by the main admin resetting it from the user panel (which ends
  that user's sessions). Feature 011 implements this.
- Templates requiring updates:
  - ✅ .specify/templates/*.md — generic; no principle text hardcoded. No edit.
  - ✅ specs/011-roles-and-users — spec, plan, contracts and tasks revised in
    the same change.
  - ✅ docs/architecture.md — Roles and permissions (011) section revised.
- Follow-up TODOs: none
-->

<!--
Sync Impact Report (amendment 5)
- Version change: 2.0.0 → 3.0.0
- Modified principles:
  - VI. Data Integrity — two bullets redefined:
    1. "Records keyed by a natural identifier (e.g. email) MUST be upserted,
       never duplicated" → natural-key records MUST NOT be silently
       duplicated; each spec states the write rule for its collection
       (upsert, refuse on conflict, or refuse within a stated time window)
       and an ADR records the choice.
    2. "Where a spec states a person may have only one record, that
       uniqueness MUST be enforced by the database (e.g. a unique index),
       never by an application-level check-then-insert" → any per-person
       limit (ever, or within a time window) MUST hold under concurrent
       requests and be enforced by the database: a unique index, or, only
       when an index cannot express the rule, a check-then-insert performed
       while holding a lock whose exclusivity is itself a database unique
       key. A check-then-insert without such a lock remains forbidden.
       Concurrency tests are now mandatory for such limits.
- Added sections: none
- Removed sections: none
- Version bump rationale: MAJOR (2.0.0 → 3.0.0) per the versioning policy:
  a MUST ("natural-key records MUST be upserted") is loosened to allow
  refuse-on-conflict and time-windowed rules, and the uniqueness bullet is
  redefined. The race-safety guarantee itself is kept (still database-
  enforced). Prompted by /sp.analyze 2026-10-03 findings C1/C2 on
  012-careers (ADR-0008, 30-day reapply window) and approved by the project
  owner by running /sp.constitution on that finding.
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md, spec-template.md,
    tasks-template.md — generic; no principle text hardcoded. No edit.
  - ✅ .claude/commands/sp.*.md — no references to the changed bullets.
  - ✅ specs/012-careers/plan.md — Constitution Check VI row now PASS under
    v3.0.0; spec FR-011 wording aligned.
  - ✅ history/adr/0008-career-application-30-day-reapply-window.md — the
    "Constitution VI wording strain" consequence now points to this
    amendment.
  - ✅ docs/architecture.md — "Validation and data rules" upsert line
    generalised.
  - ✅ Earlier features unaffected: 004 signup (upsert, being retired),
    008 messages (append-only, no natural key), 011 users (unique index on
    email) all satisfy the new wording.
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
Mongoose, Zod, Better Auth, Cloudinary (public media only), a private object
store for documents, and Playwright with Vitest. Exact versions and how
these pieces wire together are recorded in `docs/architecture.md`.

- Cloudinary is used only for public-facing media (e.g. news cover images);
  it MUST NOT be used to store documents or personal records (see Principle
  V, Personal Data).
- Documents (e.g. CVs) and other private uploads are stored in a private
  object store, not Cloudinary.
- No new frameworks, databases, or service providers may be introduced.
- No major-version upgrades of the fixed stack may be performed.
- Either change requires amending this constitution first.

**Rationale**: A small, fixed stack keeps the codebase learnable and
maintainable by a small team and avoids integration risk on a client project
with a fixed budget. Splitting public media from private documents keeps a
personal-data leak from being possible merely by knowing a Cloudinary URL.
Any stack change is an architectural decision, not an implementation detail,
and must go through governance.

### III. Roles & Access

There are exactly two admin roles: **main admin** (full access) and
**content manager** (access limited to the sections the main admin has
explicitly granted).

- Student registrations and user management are main-admin only; a content
  manager MUST NOT be able to reach them regardless of grants.
- Permission is checked on the server for every admin page, route, and
  action. Hiding a menu item or a UI control is presentation only and MUST
  NOT be relied on as the access-control mechanism.
- Public sign-up stays disabled. Accounts exist only because the main admin
  created them, or because the seed script created the initial account.
- The main admin controls every password. A content manager's password is
  set by the main admin (typed, or generated in the user panel) and can be
  changed only by the main admin; a content manager MUST NOT be able to
  change their own password. A main admin changes their own password on
  the Account page, which needs their current password.
- Passwords are stored only as hashes, are hidden by default in every form,
  and are never returned, logged or recorded in the change record.
- Permission changes and account changes (creation, role/grant changes,
  deactivation) are recorded with who made the change and when.

**Rationale**: A multi-role admin surface widens the blast radius of a
mistake or compromised account. Server-side enforcement, a single point of
control over credentials, and an audit trail make "who could do this and
did they" answerable instead of assumed. Keeping password changes with the
main admin means a stolen content-manager session can never be used to lock
the real person out or to plant a password only the attacker knows.

### IV. Security

- Passwords MUST be hashed; secrets MUST live only in environment variables,
  never in code or version control.
- Public form endpoints MUST be rate-limited and spam-protected.
- The seed script runs manually only — never invoked from build, deploy,
  postinstall, or any startup code path.

**Rationale**: This is a single-admin-origin institutional site handling
public submissions (admissions, contact forms). The attack surface is small
and known, so these controls are non-negotiable baseline hygiene rather than
aspirational goals. A seed script wired into automated pipelines is a
recurring source of accidental account creation/reset in production.

### V. Personal Data

- Uploaded documents (e.g. CVs) and personal records (registrations,
  applications, enquiries) are never reachable by public URL and are never
  served from the public media service (see Principle II).
- Documents are stored privately with unguessable keys and reach a permitted
  user only through a route that checks their session and role, delivered as
  a download rather than displayed inline in the panel.
- Uploads are accepted only after verifying the file's actual content, type,
  and size — never trusting a client-supplied filename or MIME type alone.
- Forms that collect personal data show a privacy notice approved by the
  client, and collect only fields the client has confirmed are needed.
- Personal records are deleted after the retention period agreed with the
  client.

**Rationale**: This site handles real applicants' personal data. A public or
guessable URL to a CV or application is a data-protection failure, not a
bug to fix later. Verifying uploads defends against disguised executable or
oversized payloads; retention limits keep the site from becoming an
indefinite, unaccountable store of other people's personal information.

### VI. Data Integrity

- Server-side validation is mandatory; the client reuses the same schema so
  validation rules cannot drift between layers.
- Deletes are soft by default (a `deletedAt` marker) unless a spec requires a
  confirmed hard delete.
- Records keyed by a natural identifier (e.g. email or phone) MUST NOT be
  silently duplicated. The feature's spec states the write rule for each
  such collection (upsert into one record, refuse on conflict, or refuse
  within a stated time window), and an ADR records the choice.
- Where a spec limits how many records a person may have, whether ever or
  within a time window, that limit MUST hold under concurrent requests and
  MUST be enforced by the database:
  - by a unique index; or
  - only when a unique index cannot express the rule (e.g. a time window),
    by a check-then-insert performed while holding a lock whose
    exclusivity is itself a database unique key, acquired before the check
    and released after the insert.
  A check-then-insert without such a lock is never allowed. The limit's
  tests MUST include concurrent submissions.
- No email notifications are sent in this phase.

**Rationale**: Shared Zod schemas prevent client/server validation skew.
Soft deletes protect against accidental data loss for a client with no
dedicated ops team to recover from mistakes. Stating each collection's
write rule up front, and backing every per-person limit with a database
unique key (an index, or a lock when the rule needs a time window), keeps
records deduplicated without relying on application logic that can race
or be bypassed by a second code path.

### VII. Design System

Every design value MUST come from `research/design-tokens.md` and MUST be
consumed through a named token — no raw values (colors, spacing, type sizes,
etc.) in components.

- If a value is missing, it is extracted and added to the token file first.
  It is never guessed or approximated inline.

**Rationale**: Enforces Principle I (exact-fidelity reproduction) at the
implementation level and keeps the design consistent and centrally
updatable as more sections are built.

### VIII. Content

- Content the client edits lives in the database, defined as typed field
  groups with a fixed layout: individual field values can be edited, but
  sections MUST NOT be added, removed, or reordered through that editing
  surface.
- Content the client does not edit lives in typed content files, in the same
  shape as the database-editable content, so it can be moved to the
  database later without changing the components that consume it.
- Saved content changes appear on the live site without a redeploy.

**Rationale**: Keeps client-editable content safely bounded (no risk of the
client breaking page structure) while keeping the two content sources
interchangeable at the type level, so promoting a section from static to
editable is a data migration, not a rewrite.

### IX. Components

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

### X. Extensibility

The API and data model MUST NOT assume this website is their only consumer —
a separate chatbot service is planned against the same data. At the same
time, speculative features built ahead of an actual second consumer are not
to be built.

**Rationale**: Balances two failure modes: designing the data model so
narrowly that a known future consumer requires a rewrite, versus over-
engineering for consumers that don't exist yet. The constraint is "don't
paint into a corner," not "build for hypothetical requirements."

### XI. Testing & Definition of Done

A feature is done only when all of the following hold:

- It matches its spec, its reference screenshots, and the token values in
  `research/design-tokens.md`.
- It works correctly at 375px, 768px, 1024px, and 1440px, and at the
  reference site's own breakpoints.
- Every user story has a passing end-to-end test.
- Every admin route has passing tests for all three access cases: no
  session, wrong role, and correct role.
- It violates nothing in this constitution.

**Rationale**: These are the checkpoints that make "matches the client's
real site" and "is secure" verifiable facts rather than claims. The
three-case access matrix follows directly from Principle III (Roles &
Access) — a route that only tests "no session" says nothing about whether
role scoping actually works. A feature that hasn't been checked against all
of these is not shippable, regardless of how it looks in isolation.

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
before a feature is marked done (Principle XI). Any violation found during
either check is either fixed or escalated for an explicit, approved
exception — it is never silently waived.

**Version**: 3.0.0 | **Ratified**: 2026-09-16 | **Last Amended**: 2026-10-03

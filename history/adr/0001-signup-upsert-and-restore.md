# ADR-0001: One Record Per Person — Natural-Key Upsert with Restore-on-Resubmit

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted
- **Date:** 2026-09-22
- **Feature:** 004-signup
- **Context:** The signup form (PRD §5.1, §5.6, §7) captures name, email and phone as a *lead*, and the PRD defines the data rule as "one record per email; a repeat submission updates it; records the page it came from". The constitution (IV. Data Integrity) requires natural-key records to be upserted, never duplicated, and deletes to be soft. Three forces collide: (1) the visitor must never learn whether an email is already known (the thank-you is identical for new and returning); (2) an admin may soft-delete a lead who later signs up again, and the spec requires the *same* record to come back — not a duplicate and not a silent loss; (3) two submissions for one email can arrive in the same instant. The 002 soft-delete plugin filters `deletedAt: null` into every query by default, which — if left in place — makes a re-signup of a deleted email invisible to the upsert and turns it into a unique-index violation. This is the first feature to hit these rules together, and 008-contact will be built against the same foundation shortly after, so the boundary of the rule must be stated explicitly.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

For any collection where **one person must have exactly one record** (today: `signups`), the write path is a single atomic natural-key upsert that also performs restore:

- **Identity:** the natural key is the email, normalised by the shared Zod schema before it reaches the database (trimmed, lower-cased). A **unique index on `email` with no partial filter** — so a soft-deleted record keeps its email reserved and the index, not application code, is what guarantees "exactly one".
- **Write:** one `findOneAndUpdate({ email }, update, { upsert: true, new: true, withDeleted: true, runValidators: true })` where
  - `$set: { name, phone, lastSignupAt: now, deletedAt: null }` — latest details win, latest date advances, and a soft-deleted record is restored in the same write;
  - `$addToSet: { sources: page }` — the set of pages the person signed up from grows without duplicates;
  - `$setOnInsert: { firstSignupAt: now }` — the first signup date is written once and never touched by updates or restores.
- **Soft-delete interaction:** the upsert explicitly passes the plugin's `withDeleted: true` bypass. This is the *only* place a public write is allowed to see deleted records, and it is what makes restore a data effect rather than a separate admin action. Admin delete remains `softDeleteById`; there is no admin restore in this feature.
- **Concurrency:** if the driver raises `E11000` (two first-time submissions racing on insert), retry the identical call once; the loser then matches the winner's document and updates it. Same pattern as the throttle counter in `src/lib/rate-limit.ts`.
- **Response:** the public endpoint returns the same `200 { ok: true }` for create, update and restore (and for a honeypot hit), with no id, flag or timestamp — the outcome is never observable to the submitter.
- **Boundary — where this rule does NOT apply:** contact messages (008-contact, PRD §6.4) are **append-only**: every submission is its own record with its own status (new/read/responded), even when the same email writes twice. A person is not the natural key of a message; the message is. 008 must not reuse the upsert path; it inserts. Any future collection must pick a side explicitly: "one per person" → this ADR; "one per event" → plain insert.

## Consequences

### Positive

- Correctness by construction: the unique index plus one atomic update makes "exactly one record" hold under concurrent submissions without transactions or application locks (proven by a 10-way `Promise.all` DB test in the plan).
- Restore is free and invisible: a deleted lead who returns is simply back, with `firstSignupAt`, prior `sources` and their history intact — no admin trash view, no support step, no duplicate rows for staff to reconcile.
- Privacy holds at the protocol level: because create/update/restore share one code path and one response, there is no branch that could leak "this email exists".
- The rule is reusable verbatim for any future one-per-person collection (e.g. an online admission enquiry) and its opposite is now written down, so 008-contact cannot drift into deduplicating messages by accident.
- Storing the phone in canonical E.164 alongside the normalised email means a second consumer (the planned chatbot service) reads a clean identity without re-normalising.

### Negative

- History of previous values is lost: a repeat signup overwrites name and phone; there is no audit trail of what the person typed last time. Acceptable for a lead list; would need a separate log collection if the client ever asks "what did they submit before?".
- A deleted lead cannot *stay* deleted: any re-submission (including one by someone else typing that email) resurrects the record. "Do not contact me again" is not expressible with this model — that would require a suppression flag that survives re-signup, which is out of scope and noted for the client.
- `withDeleted: true` is a sharp tool. It must appear only in the upsert; a copy-paste into a list query would leak deleted rows into the admin table. The plan mitigates this with a dedicated mutation module and tests that assert deleted records are absent from the list, search and export.
- The unique index has no partial filter, so an email can never be "freed" by deletion. If the client ever wants a hard purge (GDPR-style), it is a deliberate `deleteOne` outside this path.
- The E11000 retry is a second write on a rare path; it is bounded (one retry) and idempotent, but it is one more branch to test.

## Alternatives Considered

**A. Find-then-save (read, mutate document, `save()`)** — Simple to read, but two round trips and a race window: two first-time submissions both see "not found" and both insert; the second fails on the unique index with no recovery, or without the index creates a duplicate. Rejected: violates Constitution IV under load and needs the same retry anyway.

**B. Multi-document transaction (Atlas Flex supports sessions)** — Wraps find + insert/update atomically. Rejected: heavier (session lifecycle, retryable-write handling) for a guarantee a single-document atomic update already provides; adds nothing the unique index doesn't.

**C. Hard delete + re-insert as new** — Admin delete removes the row; re-signup creates a fresh record. Rejected: violates Constitution IV (deletes are soft by default), loses `firstSignupAt` and page history, and makes accidental admin deletes unrecoverable for a client with no ops team.

**D. Append-only submissions table with a deduplicated "people" view** — Every submission is inserted; the admin list groups by email. Keeps full history (fixes the first negative above). Rejected for signups: the PRD explicitly defines the *record* as one-per-email; grouping at read time pushes the identity rule into every query and the CSV export; more code for a benefit the client has not asked for. This is, however, exactly the right model for **contact messages**, which is why the boundary in the Decision is stated the way it is.

**E. Restore only via an explicit admin action (trash view + Restore button)** — Re-signup of a deleted email would be rejected or duplicated. Rejected: the spec requires the identical thank-you for every submitter, so rejection would leak deletion state; duplication violates the unique rule; and an admin restore screen is out of scope for 004.

**F. Partial unique index (`deletedAt: null` only)** — Frees an email on soft delete so a new record can be created. Rejected: produces duplicates (one deleted, one live) and breaks "the same record comes back"; also makes the upsert's target ambiguous.

## References

- Feature Spec: [specs/004-signup/spec.md](../../specs/004-signup/spec.md) — FR-012 to FR-016, User Stories 2 and 4, Clarifications
- Implementation Plan: [specs/004-signup/plan.md](../../specs/004-signup/plan.md)
- Research: [specs/004-signup/research.md](../../specs/004-signup/research.md) §1 (upsert), §2 (phone canonical form), §3 (identical response), §9 (concurrency test)
- Data Model: [specs/004-signup/data-model.md](../../specs/004-signup/data-model.md) — indexes, upsert, state transitions
- Contract: [specs/004-signup/contracts/public-signup-api.md](../../specs/004-signup/contracts/public-signup-api.md) — invariants
- Foundation: [specs/002-foundation/spec.md](../../specs/002-foundation/spec.md) FR-030 (soft delete), `src/lib/soft-delete.ts` (`withDeleted` option), `src/lib/rate-limit.ts` (E11000 retry precedent)
- Constitution: `.specify/memory/constitution.md` IV. Data Integrity
- Related ADRs: none (first ADR)
- Evaluator Evidence: [history/prompts/004-signup/0003-plan-signup-feature.plan.prompt.md](../prompts/004-signup/0003-plan-signup-feature.plan.prompt.md), [history/prompts/004-signup/0005-adr-signup-upsert-and-restore.misc.prompt.md](../prompts/004-signup/0005-adr-signup-upsert-and-restore.misc.prompt.md)

# ADR-0008: Career Applications — 30-Day Reapply Window on Email or Phone, Serialised by Per-Identity Locks

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted
- **Date:** 2026-10-02
- **Feature:** 012-careers
- **Supersedes:** [ADR-0003](0003-career-application-one-per-person.md) (one active application per person, compound key) and [ADR-0006](0006-career-application-match-either-field.md) (one active application per email and per phone, two partial unique indexes). Kept from them: match on email **or** phone (ADR-0006); refuse, never merge, upsert or restore (ADR-0003); main-admin delete as a way back in (spec Q2).
- **Context:** The owner replaced "one application per person, until an admin deletes it" with a **time window**: a person may not apply again within 30 days of their last application, matched on email or phone, and after 30 days may apply again with no admin action. This also answers PRD Open Question 5 (PRD v0.4). A unique index can say "never two at once" but not "not two within 30 days", so ADR-0006's partial unique indexes no longer express the rule. The rule must still hold when two submissions arrive at the same moment (spec edge case). Constitution VI forbids a bare check-then-insert for one-per-person rules precisely because it races.

## Decision

- **Window rule (one named constant).** `CAREERS_REAPPLY_WINDOW_DAYS = 30` in `src/lib/careers/rules.ts`. The validation, the refusal message, the tests and the copy all import it, so the literal `30` appears nowhere else. Days are **calendar days in Asia/Karachi** (the admin's existing date convention): an application made on PKT date *D* blocks submissions through *D + 29*, and the person may apply again from 00:00 PKT on *D + 30*. Calendar days make the refusal message's single date exact. With a rolling 720 hours, a visitor told "from 1 November" could still be refused on the morning of 1 November.
- **What blocks.** Any **non-deleted** application, ACTIVE or still PENDING (insert-first write order, ADR-0007), whose email **or** phone equals the new submission's normalised value and whose `createdAt` falls on or after 00:00 PKT of (today − 29 days). Soft-deleted applications never block: the soft-delete plugin's default filter excludes them, so a main-admin delete still lets someone reapply at once. If every match is PENDING and older than 5 minutes (a crash-left upload), the answer is 503 "try again" rather than a misleading 30-day refusal; the hourly sweep removes such records (added 2026-10-03 from /sp.analyze finding U1).
- **Indexes.** The two unique partial indexes are removed. In their place are non-unique `{ email: 1, createdAt: -1 }` and `{ phone: 1, createdAt: -1 }`, which serve the window lookup as two index-bounded queries (or one `$or`).
- **Race prevention: per-identity locks in the database.** A new collection `careerApplicationLocks`, `_id` = `"email:" + sha256(email)` or `"phone:" + sha256(phone)` (hashed, so the lock collection holds no personal data), `owner` (random per request), `expiresAt`. TTL index on `expiresAt` for garbage collection.
  1. **Acquire** each key in a fixed order (sorted `_id`) with one atomic `findOneAndUpdate({ _id, expiresAt: { $lte: now } }, { $set: { owner, expiresAt: now + 30 s } }, { upsert: true })`. If another request holds an unexpired lock, the filter misses, the upsert tries to insert the same `_id`, and MongoDB rejects it with `E11000`: the lock is held. Retry every 200 ms for up to 2 s, then give up with 503 `try_again` (typed details kept). A crashed holder's lock is taken over as soon as its `expiresAt` passes, so the TTL monitor's delay never blocks anyone.
  2. **Inside the locks:** run the window check, then insert the PENDING application. Queries use `maxTimeMS: 5000`. If the critical section exceeds 10 s (well under the 30 s lease), abort with 503 rather than risk a lease that expired underneath it.
  3. **Release** both locks in `finally` with `deleteOne({ _id, owner })`, so a lock can only be released by the request that owns it.

  **Why two simultaneous submissions can't both pass:** any two submissions that share an email or a phone need the same lock `_id`. MongoDB's unique `_id` lets only one of them hold it. The second can enter only after the first has inserted its application and released the lock, so the second's window check sees that application and refuses. Submissions that share nothing take different locks and run in parallel. The guarantee rests on a database-enforced unique key, the lock's `_id`, not on application timing.
- **Refusal.** **409** `{ error: "already_applied", reapplyFrom: "<YYYY-MM-DD>" }`, where `reapplyFrom` is the PKT date *D + 30* of the **latest** blocking application (if email and phone match different applications, the later one decides). The UI message reads "You applied recently. You can apply again from {date}." It never says which field matched and never shows stored details. The response is identical whichever field matched. No store write happens (the check runs before `put`).
- **Reapplying after 30 days creates a new, separate record.** The earlier application is **kept unchanged**: no merge, no update, no link. Both appear in the admin list, newest first. *Client confirmation pending* (PRD v0.4 TBD). The alternatives the client may prefer are noted below.
- **Unchanged:** the insert-first pending write order and the 1-hour abandoned-pending cleanup; main-admin-only delete; retention sweep; CV handling (ADR-0007).

## Consequences

### Positive

- **The owner's rule is expressible and enforced under concurrency**, by a database unique key (the lock `_id`) rather than by timing luck.
- **No admin chore for genuine reapplicants** after a month, and admins see the full history of a person's applications, because nothing is overwritten.
- **The lock collection is tiny and anonymous** (hashed keys, lifetimes of seconds), so it adds no personal-data store, which matters for Constitution V.
- **The refusal is actionable**: the applicant knows exactly when to try again.

### Negative

- **More moving parts than a unique index:** lock acquire, retry and release logic and a lease timeout, with its own tests (concurrent same-email, same-phone, crash-left lock taken over, lease expiry). A unique index needed none of this.
- **The refusal discloses more than before.** Anyone who types someone else's email or phone learns that a non-deleted application from that identity exists from within the last 30 days, and roughly when, because the date is shown. It still never says which field matched or shows any stored data. This is a deliberate trade the owner made for a clearer applicant message. Per-IP submission and upload limits keep such probing slow. Flagged for client awareness.
- **Needed a constitution amendment.** VI (≤ v2.0.0) required a unique index and an upsert for natural-key records. Constitution v3.0.0 (2026-10-03) now allows exactly this design: a spec-stated refuse-within-window rule, enforced by check-then-insert only while holding a lock whose exclusivity is a database unique key, with mandatory concurrency tests.
- **Duplicates across the window are intentional**, so the CSV export and the list can contain the same person more than once. Reports must not assume one row per person.
- **Lock contention under a real burst** (the same person double-clicking) yields one success, and the other request either waits up to 2 s or gets the 409. Only a stalled holder produces a 503, and then the details are kept.

## Alternatives Considered

**A. Keep ADR-0006's partial unique indexes and expire the uniqueness after 30 days** (e.g. a field `activeUntil` with the partial filter `activeUntil > now`). Rejected: partial filter expressions are evaluated at write time against constants, not against a moving "now", so an index can't age a document out of uniqueness by itself. It would need a job that flips a flag at day 30, which is a scheduler the project doesn't have, and a missed run would block people wrongly.

**B. One "claim" document per identity with a unique `_id` and `until` date** (`findOneAndUpdate({_id, until: {$lte: now}}, {$set: {until: now + 30d}}, {upsert})`, so the claim itself encodes the window). Atomic per key and needs no window query. Rejected: two claims (email and phone) must be taken together and **rolled back to their previous values** if the second fails or the store write later fails, and must be released when the main admin deletes an application. That is more state to keep consistent than short-lived locks plus a query over the source of truth. It also duplicates the window outside the applications collection, so the two can drift.

**C. A MongoDB transaction around check + insert.** Rejected: under snapshot isolation two concurrent transactions can both read "no recent application" and both insert, because the reads don't conflict. It would need an artificial write-conflict document, which is the lock design under another name, and it adds transaction requirements on Atlas Flex.

**D. Bare check-then-insert.** Rejected: races (Constitution VI; the spec's simultaneous-submission edge case).

**E. On reapply, replace or merge into the earlier application.** Rejected as the default: it contradicts "never merged or overwritten" and loses history. It remains a client option, along with **F. soft-deleting the earlier one automatically on reapply** (keeps one visible row per person and history in the database). Either would change only the success branch, not the locking or the window.

## References

- Feature Spec: [specs/012-careers/spec.md](../../specs/012-careers/spec.md) (Clarifications; US2; FR-010 to FR-014)
- Plan / data model / contract: [plan.md](../../specs/012-careers/plan.md), [data-model.md](../../specs/012-careers/data-model.md), [public-careers-api.md](../../specs/012-careers/contracts/public-careers-api.md), [document-store.md](../../specs/012-careers/contracts/document-store.md)
- PRD: [docs/prd.md](../../docs/prd.md) v0.4 §5.9, §7, Open Question 5 (resolved)
- Constitution: V (Personal Data), VI (Data Integrity, v3.0.0 amendment)
- Related ADRs: [ADR-0003](0003-career-application-one-per-person.md) and [ADR-0006](0006-career-application-match-either-field.md) (superseded), [ADR-0007](0007-private-document-store-vercel-blob.md) (insert-first write order, unchanged), [ADR-0001](0001-signup-upsert-and-restore.md)
- Evaluator Evidence: [history/prompts/012-careers/0007-reapply-window-prd-fix-signup-scope.misc.prompt.md](../prompts/012-careers/0007-reapply-window-prd-fix-signup-scope.misc.prompt.md)

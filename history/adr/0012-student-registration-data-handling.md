# ADR-0012: Student Registration Data Handling — Append-Only Writes, Read-Time Duplicate Flag, At-Rest Encryption Only, 30-Day Deletion Grace

- **Status:** Accepted (approved by the owner, 2026-10-15)
- **Date:** 2026-10-14
- **Feature:** 013-student-registration
- **Context:** Parents submit registrations for their children at `/admission/register`. Each one holds the child's name, date of birth, parents' contacts and address, health information (vaccination, medical history), and details of a referenced student. This is the most sensitive data the site stores. Constitution VI requires every collection to state its write rule and, where a natural key exists, enforce it in the database. Constitution V requires private storage, a client-approved notice and retention-based deletion. The brief adds specific rules:
  - siblings share parents' email and phone, so duplicates must **not** be blocked
  - a likely duplicate (same student name + date of birth + father's mobile) is flagged instead
  - only the main admin sees registrations
  - health and reference details never reach logs, notifications or public responses
  - MongoDB Atlas at-rest encryption is relied on, with no field-level encryption this phase

  The owner then decided (2026-10-14) that deleted registrations are permanently removed 30 days after deletion and can be restored until then. Careers (ADR-0008) set the nearest precedent: refusal within a window under database-enforced locks, and a sweep triggered only by submissions.

<!-- Significance checklist
     1) Impact: yes. It fixes the write rule, the deletion lifecycle and the encryption posture for children's health data; reversing any of them later means a data migration or a security review.
     2) Alternatives: yes. Blocking/merging duplicates, a stored flag, field-level encryption, immediate purge and retention-age purge were all viable.
     3) Scope: yes. It spans the model, the public route, admin queries and mutations, the sweep, notifications, logging, the release gate and the privacy notice. -->

## Decision

**Write rule (Constitution VI)**
- `studentRegistrations` has **no natural key**. Every valid submission inserts a new record. Nothing is refused, merged or upserted because of a shared email, phone or student.
- The only database-enforced uniqueness is the public **reference number**: 8 random characters from a 31-character alphabet with no look-alikes, under a unique index, retried on collision. It is never sequential and never derived from the record id.
- No per-person limit exists, so no identity lock is needed (unlike ADR-0008). Abuse is limited per IP (5 per 10 minutes, in the database) and by the honeypot.

**Likely-duplicate flag**
- On insert, store `duplicateKey = sha256(NFC(lower(collapsed studentName)) | dateOfBirth | fatherMobile)`, or `null` without a father's mobile.
- The flag is **computed when the list or detail is read**: a registration is flagged while at least one other non-deleted registration has the same key, using one indexed aggregate per page. Nothing is written back, so deletes and restores update it automatically.

**Encryption and visibility**
- **At rest:** rely on Atlas at-rest encryption and TLS in transit. **No field-level or client-side encryption** this phase.
- **Who can see it:** only the main admin. Pages answer **404** to content managers (via the new `requireAdminPageOr404`), and routes answer 403. Notification counts and items are gated by role in the query layer.
- **Health and reference details:** shown only in the admin detail view (a distinct Health block) and the CSV export. Never in the list, notifications, Overview, logs or error bodies.
- **Logs:** carry the registration id and the acting admin's email only. Route errors never include exception messages or submitted values. Tests grep captured logs and responses for seeded values.
- **CSV exports:** each export is recorded in `registrationExports` (who, when, row count, class filter, whether a search was used). The search text is **not** stored.

**Deletion lifecycle**
- **Manual delete** (main admin, confirmed) is a soft delete recording who and when.
- **Restore:** for `REGISTRATION_DELETE_GRACE_DAYS = 30` the record appears in a Deleted view and can be restored unchanged. Both delete and restore are single conditional writes on one document, so a restore racing the sweep ends in one outcome.
- **Permanent removal** (hard delete, history included) happens at the **earlier** of 30 days after deletion or `REGISTRATION_RETENTION_MONTHS` after submission (default 12; required in production by the release gate). Export records follow the same retention.
- **Sweep triggers:** an hourly-throttled opportunistic sweep runs from the submission route **and** from visits to `/admission/register` and the registration admin pages, plus `npm run sweep:registrations`. Submissions only arrive while the window is open, so a submit-only trigger (the careers pattern) would stall between windows.
- **Privacy notice:** states the retention period and that deleted records are permanently removed within 30 days.

## Consequences

### Positive

- **Siblings are never blocked.** Every genuine submission is kept, and staff still see likely repeats.
- **No race to defend.** Concurrent submissions can't violate a rule, because there is no per-person rule. The only uniqueness is the database-enforced reference.
- **The flag can't go stale.** Computing it on read means delete and restore need no extra write paths, and hashing avoids a second plain copy of the child's name.
- **A predictable deletion story** for parents and staff: a mistaken delete can be undone for 30 days, after which the data is really gone. The notice says so.
- **Retention holds between admission windows,** because the sweep is triggered by page visits as well as submissions.
- **Least exposure:** the sensitive fields reach exactly two surfaces (detail and CSV) and one role, and the logging rule is enforced by tests.
- **No key management:** no keys to store, rotate or lose, and the fixed stack stays as it is (Constitution II).

### Negative

- **Repeats are allowed.** A parent who submits twice creates two records; staff resolve them by hand using the flag.
- **The flag only catches exact matches** after normalisation. A misspelt name or a missing father's mobile won't be flagged.
- **No protection beyond the database.** Anyone with database access (Atlas users, a leaked connection string, backups) can read health data in plain text. Atlas at-rest encryption protects the disks, not the database users.
- **Backups outlive deletion.** Atlas backups may keep deleted records beyond 30 days or the retention period, until the backup itself expires. This must be stated to the client if the notice's "permanently removed" is read strictly.
- **The sweep still depends on traffic.** A long period with no admin or register-page visits delays removal until someone visits or the script is run. A scheduled job is a follow-up once hosting is chosen.
- **Search costs.** The extra aggregate per list page, and regex search without a text index, are fine at the expected scale (~1–2k a year), but would need revisiting at much larger volumes.

## Alternatives Considered

- **Refuse or merge duplicates** (unique index on email/phone, or the ADR-0008 time window with identity locks). Rejected: siblings legitimately share every contact field, and refusing would push parents to invent details. The brief forbids blocking.
- **Unique index on the duplicate key** (block the same child twice). Rejected: a parent correcting a mistake by resubmitting would be refused, and a false match (a data-entry slip in the DOB or mobile) would block a real child with no way for staff to override.
- **Store an `isDuplicate` boolean**, updated on insert, delete and restore. Rejected: three write paths must stay consistent under concurrency, and a missed update leaves a wrong flag. Computing on read is cheaper to get right.
- **Field-level encryption** (MongoDB CSFLE / Queryable Encryption, or app-level AES on the health and reference fields). Deferred, not rejected. It protects against database-level readers, but needs a key store (KMS or env-held master key) and rotation. It breaks regex search and sorting on encrypted fields and adds a dependency outside the fixed stack. Revisit if the client's data-protection obligations or a security review require it; the health and reference fields are the first candidates.
- **Immediate permanent removal on delete.** Rejected by the owner (Q1 option A): there's no undo for a mistaken click on children's records.
- **Keep deleted records until the normal retention age** (the careers pattern, Q1 option C). Rejected by the owner: deleted health data would sit in the database for up to a year.
- **Sweep only on submissions** (careers). Rejected: registrations stop arriving when the window closes, so records could outlive retention by months.
- **Log exports to stdout only.** Rejected: serverless logs are neither durable nor reviewable by the school, and FR-038 needs a lasting record.
- **Redirect content managers to `/admin?denied=1`** (the existing page behaviour). Rejected for this section: it confirms the section exists. 404 reveals nothing.

## References

- Feature Spec: [specs/013-student-registration/spec.md](../../specs/013-student-registration/spec.md) (Clarifications Q1; FR-026–FR-030, FR-033, FR-038–FR-043)
- Implementation Plan: [specs/013-student-registration/plan.md](../../specs/013-student-registration/plan.md)
- Research: [research.md](../../specs/013-student-registration/research.md) §6–§12, §14, §16
- Data Model: [data-model.md](../../specs/013-student-registration/data-model.md)
- Contracts: [public-registration-api.md](../../specs/013-student-registration/contracts/public-registration-api.md), [admin-registrations-api.md](../../specs/013-student-registration/contracts/admin-registrations-api.md), [access-matrix-delta.md](../../specs/013-student-registration/contracts/access-matrix-delta.md)
- Related ADRs: ADR-0008 (careers write rule and identity locks; this ADR deliberately differs), ADR-0004 (private storage for personal records; unchanged, no documents here), ADR-0011 (admission window; reused, and amended by 013's class-list condition, see plan)
- Evaluator Evidence: [history/prompts/013-student-registration/34-adr-registration-data-handling.misc.prompt.md](../prompts/013-student-registration/34-adr-registration-data-handling.misc.prompt.md)

# ADR-0003: Career Applications — One Per Person, Matched on Email and Phone, Refused Not Merged

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Superseded by [ADR-0008](0008-career-application-30-day-reapply-window.md) (2026-10-02). Its identity rule was first replaced by ADR-0006; its permanent one-per-person rule is now a 30-day reapply window. The refuse-never-merge principle carries forward in ADR-0008.
- **Date:** 2026-09-28
- **Feature:** 012-careers (planned — PRD §5.9, §6.7; spec not yet created)
- **Supersedes:** [ADR-0001](0001-signup-upsert-and-restore.md), for the "one person, one record" write model. ADR-0001's mechanism (natural-key upsert + automatic restore-on-resubmit) was written to be "reusable verbatim for any future one-per-person collection." Career applications are that next collection, and the PRD's rules for them (§5.9, §6.7) require the opposite write behavior on every point that matters, so this ADR replaces that reuse claim rather than extending it.
- **Context:** PRD v0.3 §5.9 and §6.7 define career applications as: matched on **both** email and phone; a repeat attempt is **refused with a clear message, not merged**; and "the main admin can delete an application to let someone reapply." Constitution v1.2.0 VI (Data Integrity) additionally now requires that any spec-mandated one-record-per-person rule be enforced by the database, not by an application-level check first — a rule added specifically because of this feature. ADR-0001 already solved "one record per person" once, for signups, but its solution (silent upsert, automatic restore on any resubmit, identical response whether new or returning) was shaped by signups' own PRD text ("a repeat submission updates it") and by a privacy requirement (the visitor must never learn whether their email was already known). Career applications have neither property: the PRD wants a visible rejection on repeat, wants updates to never silently happen, and wants deletion to be the *only* door back in. Because 004-signup is itself being reworked into careers (PRD §9 Build Order), the collection ADR-0001 was written for is being retired, making this the moment to state the new rule rather than let the old one drift by assumption.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

For the `careerApplications` collection, "one person, one record" is enforced as **refuse-on-conflict**, not upsert-and-restore:

- **Identity: the compound pair (email, phone), not either field alone.** Both are normalised by the shared Zod schema before reaching the database — email trimmed/lower-cased, phone in canonical E.164 — the same normalisation ADR-0001 established. A **partial unique index on `{ email, phone }` filtered to `deletedAt: null`** is what makes "exactly one *active* application" a database-enforced fact (Constitution VI), not an application-level check.
- **Write: plain insert, no upsert.** A new application is always a new document. There is no `findOneAndUpdate` on this path. If the compound key collides with an existing, non-deleted document, the write fails (`E11000`) and the API returns a clear, visible rejection to the submitter (e.g. "You've already applied — we'll contact you") — the opposite of ADR-0001's identical-response-always rule. Career applications are not a privacy-sensitive lead-capture flow; the PRD explicitly wants the applicant to know.
- **No merge, no silent update.** A second attempt while an application is active never changes the stored document — not the qualification, not the CV, not the contact details. The only way stored data changes is a brand-new insert after the old one is gone.
- **Reapplication is admin-gated, by construction of the index.** Because the unique index is partial (`deletedAt: null`), a soft-deleted application frees its `(email, phone)` key. The next matching submission is a genuinely new document — new `_id`, new CV, no history carried over from the deleted one, and no restore. Deleting is the only action that reopens the door; nothing about resubmission itself does.
- **CVs are unaffected by this decision** and continue to follow Constitution V (Personal Data) / PRD §6.7: stored privately, never on the public media service, downloadable only by a permitted admin. This ADR governs the application *record's* identity and write path, not file storage.

## Consequences

### Positive

- **Constitution VI is satisfied by construction.** The partial unique index — not a check-then-insert — is what makes duplicate applications impossible, closing the exact race ADR-0001 §Alternatives A already identified as unsafe (two first submissions racing both see "not found").
- **Nothing an admin is reviewing can be clobbered from outside.** Because repeat attempts are refused rather than merged, a CV or set of answers an admin is mid-review on cannot be silently replaced by a second, possibly lower-quality submission.
- **Admin delete becomes a real, meaningful gate**, directly answering PRD §11 open question 5 ("may a rejected applicant reapply later, or only if the admin deletes their application?") at the data-model level: reapplication is possible if and only if an admin has deleted the prior record. This also gives the action a natural audit trail for free, via the existing soft-delete timestamp.
- **The visible "already applied" rejection matches applicant expectations for a job application** (unlike a lead form, applicants generally expect to know their submission was received/recognised) and avoids the confusion of a silently-dropped second attempt.

### Negative

- **Partial unique index is the opposite choice ADR-0001 made for signups** (ADR-0001 explicitly rejected a partial index — its Alternative F — because it wanted deletion to never free an email). A future reader comparing the two ADRs side by side must not assume one is "more correct"; they encode genuinely different product requirements. This ADR's Supersedes note exists specifically so that comparison doesn't get missed.
- **No self-service correction.** An applicant who mistypes their email or phone has no way to fix their own application; they must contact the school and wait for an admin to delete the old record before resubmitting correctly.
- **The compound key does not catch every real duplicate.** Two genuinely different phone numbers (e.g. the applicant used a second number the next day) for the same person will not collide and will both be accepted as separate applications; the PRD's own matching rule ("matched on both email and phone") accepts this as the defined boundary rather than attempting identity resolution beyond it.
- **Deleting to "allow reapply" does not itself address the CV file's lifecycle** (whether the old CV in the private object store is deleted, retained, or orphaned) — that is a private-object-store implementation detail for 012-careers' own plan, not settled by this ADR.

## Alternatives Considered

**A. Reuse ADR-0001's upsert-and-restore model as-is.** Rejected: a resubmission would silently restore and overwrite the deleted application, making the PRD's explicit "admin can delete to let someone reapply" pointless — the very next resubmit would undo the deletion. Directly contradicts PRD §6.7 and §5.9.

**B. Merge/update-in-place on repeat submission** (treat a second attempt as an edit of the first, like a profile update). Rejected: the PRD says "not merged," and it risks an admin's in-progress review being invalidated mid-read, or a genuine applicant's CV being overwritten by a second, unrelated submission that happens to share contact details (e.g. a sibling using a shared home phone).

**C. Application-level check-then-insert** (query for an existing match, insert only if none found). Rejected: races under concurrent submissions — the same failure mode ADR-0001 §Alternatives A already ruled out for signups — and now directly violates Constitution VI's explicit requirement that this class of rule be database-enforced, not checked first.

**D. Full (non-partial) unique index on `{ email, phone }`**, matching ADR-0001's approach for signups. Rejected: an email/phone pair could never be freed by deletion (mirrors ADR-0001's own documented negative consequence), which would make the PRD's admin-delete-to-reapply mechanism impossible to implement as specified.

**E. Single-field unique index (email only, or phone only).** Rejected: the PRD is explicit that matching requires both fields together. A single-field key would falsely flag two different applicants who share a household phone number as duplicates, or would let the same applicant bypass the check entirely by reusing a new email with the same phone.

## References

- Feature Spec: not yet created (012-careers, PRD §9 Build Order — "next")
- PRD: [docs/prd.md](../../docs/prd.md) §5.9 (Careers), §6.7 (Career applications), §7 (Data)
- Constitution: `.specify/memory/constitution.md` v1.2.0 — III (Roles & Access), V (Personal Data), VI (Data Integrity)
- Related ADRs: [ADR-0001](0001-signup-upsert-and-restore.md) (superseded for the one-per-person write model; its boundary rule for contact messages — see below — is unaffected and still authoritative), [ADR-0002](0002-admin-notifications-live-state-and-shared-popover.md) (unrelated, referenced only for numbering continuity)
- Evaluator Evidence: [history/prompts/general/0005-adr-career-application-one-per-person.general.prompt.md](../prompts/general/0005-adr-career-application-one-per-person.general.prompt.md)

## Appendix: Why contact messages are unaffected

Contact messages (008-contact-messages, PRD §5.8/§6.6) remain exactly as ADR-0001 already established: **append-only, one record per submission**, with no identity-based deduplication at all. ADR-0001's own boundary rule already drew this line explicitly ("a message is not identity-scoped... 008 must not reuse the upsert path; it inserts"), and ADR-0001 §Alternatives D recorded why grouping/deduplicating messages by sender was rejected (a person may message about unrelated topics on different days; the PRD wants full history, not a merged thread). Nothing in this ADR changes that: career applications and contact messages answer two different questions — "does this person already have an application on file?" versus "what did this person send us?" — and only the first is an identity question at all. This ADR narrows ADR-0001's *reusable-verbatim* claim to "not for career applications"; it does not touch the messages boundary, which stands as originally decided.

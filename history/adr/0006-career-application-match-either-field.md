# ADR-0006: Career Applications — Match a Repeat Applicant on Email or Phone, Each Unique on Its Own

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Superseded by [ADR-0008](0008-career-application-30-day-reapply-window.md) (2026-10-02). Email-OR-phone matching carries forward; the two partial unique indexes are replaced by a 30-day window enforced with per-identity locks.
- **Date:** 2026-10-02
- **Feature:** 012-careers
- **Supersedes (in part):** [ADR-0003](0003-career-application-one-per-person.md), its **identity** rule only, the compound `(email, phone)` key and its Alternative E. Everything else in ADR-0003 stands unchanged: refuse on conflict (never merge or upsert), a plain insert, soft delete as the only way to reapply, and enforcement by the database.
- **Context:** ADR-0003 followed PRD §5.9 ("one application per person, matched on both email and phone") and made the compound pair `(email, phone)` the identity key. The 012-careers feature brief (2026-10-02) changes the rule to "a person may apply once, matched on **either** email or phone", and its acceptance tests require that reapplying with the same email (different phone) **and** with the same phone (different email) are both refused. Under the compound key both of those attempts would succeed, because neither repeats the *pair*. So the two rules cannot both hold: the compound key lets one person reapply indefinitely by changing one field, which defeats "one application per person". The brief also adds a privacy requirement ADR-0003 did not have: the refusal must not confirm to a stranger anything beyond what they typed themselves. Constitution VI still requires that the uniqueness is enforced by the database, not by a check-then-insert. Specification: `specs/012-careers/spec.md` FR-010 to FR-014.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

For the `careerApplications` collection, identity is **either field independently**:

- **Identity rule:** a submission conflicts with an active application if its normalised email matches, **or** its normalised phone matches. The two fields are separate keys, not a pair.
- **Normalisation (unchanged from ADR-0001/0003):** the shared validation schema normalises email (trimmed, lower-cased) and phone (one canonical E.164 form) before any write, on both the client and the server.
- **Database enforcement:** there are **two partial unique indexes**, one on `email` and one on `phone`, each filtered to `deletedAt: null`. Either index rejecting the insert (`E11000`) is a conflict. There is no pre-insert lookup on the write path, so concurrent submissions sharing either field produce exactly one application (Constitution VI).
- **One refusal, whichever field matched:** the API maps a duplicate-key error from *either* index to the same response, the same status and the same wording ("An application with these details already exists"). It never says which field matched and never returns stored data. The response shape and status must not vary by index.
- **Write path and reapplication (carried over from ADR-0003):** a plain insert, never an upsert, merge or restore. A soft delete frees *both* keys at once, because both indexes are filtered on the same `deletedAt` marker. The next submission is a brand-new document with a new CV.
- **CV ordering:** a duplicate refusal must not leave a stored CV behind. Either the insert runs before the file is committed, or a CV stored before a rejected insert is removed in the same request. Which of the two is a 012 plan detail, but the invariant "a refusal leaves no file" is part of this decision.
- **Who may delete (and so let someone reapply)** is a permission question, still open as spec Q2. This ADR does not decide it.

## Consequences

### Positive

- **"One application per person" actually holds.** Changing only the phone or only the email no longer gets around the rule, so admins aren't given two CVs from the same applicant to reconcile.
- **Still enforced by the database.** Two partial unique indexes keep Constitution VI satisfied, including the concurrent-submission edge case in the spec, with no application-level check that can race.
- **Deleting stays a single clean step.** One soft delete frees both keys together, so ADR-0003's rule that deletion is the only way to reapply carries over unchanged.
- **Tests are easy to state.** Same email gives a refusal. Same phone gives a refusal. Same both gives a refusal. Delete and then apply gives success. Each case maps to one index and needs no fixture with combinations of fields.

### Negative

- **Shared contact details block other people.** Two different applicants who share a household phone, or a shared email address, cannot both apply. The second is refused and has to contact the school. ADR-0003's Alternative E rejected single-field keys for exactly this reason. This ADR accepts that cost, on the brief's view that a duplicate getting through is worse for this client than a refused household member.
- **Some probing is unavoidable.** Whatever the wording, a refusal tells the submitter that *one* of the values they typed is already on file. The wording can hide *which* one, and that it shows no stored data. It cannot hide that one matched. Mitigations: wording that names neither field, a response that looks the same for either index, and the per-visitor submission and upload rate limits (spec FR-022, FR-032), which keep probing slow. Leaking only what the applicant typed themselves is the boundary the brief accepts.
- **The PRD disagrees until it is amended.** PRD §5.9 still says "matched on both email and phone". It needs a change-log entry (v0.4) with client approval so the PRD, ADR and spec agree.
- **Two indexes instead of one.** There is slightly more write overhead, and two index definitions to keep in step with the `deletedAt` filter. If one of them loses the filter, deleted applications would block reapplication for that field. Tests must cover reapplying after delete for both fields.

## Alternatives Considered

**A. Keep ADR-0003's compound `(email, phone)` key (one partial unique index on the pair).** Rejected: it fails the brief's acceptance tests, since a same-email/different-phone attempt is accepted, and it lets one person hold several applications by changing one field. It does avoid blocking shared households.

**B. Either-field matching enforced by an application-level lookup (`find { $or: [email, phone] }` then insert).** Rejected: concurrent submissions can race between the lookup and the insert. Constitution VI forbids that for any one-per-person rule.

**C. A single derived "identity" field with a unique index (e.g. an array `identityKeys: [email, phone]` under a multikey unique index).** Rejected: it gives the same behaviour as two indexes, but it adds a derived field to keep in step on every write. It also makes the rule harder to read off the schema, and multikey unique indexes behave in ways that are easy to misread (uniqueness across documents, not within one). Two plain indexes say the rule directly.

**D. Email-only uniqueness (phone not checked).** Rejected: it fails the brief's same-phone acceptance test, and changing the email is the easiest way around it.

**E. Either-field matching with a refusal that names the matching field ("this email has already applied").** Rejected: it tells a stranger which of the values they typed is on file. The brief explicitly limits what the refusal may confirm.

## References

- Feature Spec: [specs/012-careers/spec.md](../../specs/012-careers/spec.md) (US2, FR-010 to FR-014, edge cases)
- Implementation Plan: not yet created (`/sp.plan` pending). Index definitions, error mapping and CV ordering are taken from this ADR
- PRD: [docs/prd.md](../../docs/prd.md) §5.9 (needs amending to "either"), §6.7
- Constitution: `.specify/memory/constitution.md`, IV (Security: rate limits), V (Personal Data), VI (Data Integrity: database-enforced uniqueness)
- Related ADRs: [ADR-0003](0003-career-application-one-per-person.md) (superseded in part, identity rule only), [ADR-0001](0001-signup-upsert-and-restore.md) (normalisation origin), [ADR-0004](0004-private-document-storage.md) (CV storage)
- Evaluator Evidence: [history/prompts/012-careers/0002-adr-match-either-field.misc.prompt.md](../prompts/012-careers/0002-adr-match-either-field.misc.prompt.md)

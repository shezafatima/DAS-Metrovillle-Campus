# ADR-0005: Gallery Albums Data Architecture — One Compare-and-Set Document, Outside the Settings Form Engine

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted
- **Date:** 2026-09-30
- **Feature:** 007-gallery-albums (replaces the flat Photo gallery group of 005-settings)
- **Context:** Feature 007 replaces 005's flat photo gallery with albums, with two hard caps: at most **6 albums** and at most **8 photos per album**. The brief requires both caps to be enforced "in the interface and on the server". It also requires that "two admins uploading at once cannot push an album past 8 photos", and tests must prove the caps hold when the server is called directly. The existing stack already fixes several constraints. MongoDB Atlas is accessed through Mongoose, and 005 deliberately avoided assuming multi-document transactions. 005 stores each Settings group as one document in the `settings` collection with a `version` compare-and-set counter (`src/lib/settings/mutations.ts`). 005's admin screens are generated from typed field definitions and saved as a whole group through one staged form (`saveSettingsGroup`). The gallery is tiny (≤ 48 live photos), but it is written by several admins, per action, with uploads arriving concurrently. Existing flat-gallery content must be migrated into albums ("Gallery", "Gallery 2" … capped at 48, with the rest discarded and counted), and it must not be written through the old path afterwards.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

The gallery's data architecture is one integrated cluster:

- **Storage shape**: the whole gallery is **one document**, `settings/_id: "gallery"`, in the existing `settings` collection. Its `data` has a versioned shape `{ schema: 2, albums: Album[], retired: RetiredImage[] }`, and albums embed their photos. There are no new collections and no change to the Mongoose model.
- **Cap enforcement through a single writer with compare-and-set**: every write goes through one module (`src/lib/gallery/store.ts`). It reads the document, applies a pure rule function (`src/lib/gallery/rules.ts`) that checks the cap against the live counts, and writes with `findOneAndUpdate({ _id, version })` and `$inc: { version: 1 }`. Because every cap check is tied to the version it was made against, two concurrent writers can never both succeed from the same state.
- **Two concurrency policies, by kind of action**:
  - *Structural actions* (create album, add photos, reorder, set cover, caption, delete) **retry** on a version mismatch, up to 5 times. Each retry re-reads the document and re-applies the rule, so admins working on different albums don't fail each other, and the cap is still decided serially. `addGalleryPhotos` accepts the first *k* images that fit and deletes the refused assets from Cloudinary.
  - *Album detail edits* (title, description, date) carry a **per-album `rev`** and are **refused** when it's stale, with the 005 "changed by someone else" message. This prevents silent overwrites of another admin's typing.
- **Immediate per-action saves**: nine Server Actions under the `settings` permission, each saving at once. There is no staged group form.
- **Leaving the Settings form engine**: `gallery` is removed from `GROUP_KEYS`, the group definition and the public shape mapper. `saveSettingsGroup({ group: "gallery" })` is then refused, which leaves exactly one code path that can write the gallery document. The admin UI stays inside the Settings area and permission.
- **Migration in the same document**: a pure, idempotent `migrateFlatGallery()` rewrites the 005 flat shape into schema 2 with a single compare-and-set. It runs from `npm run migrate:gallery` at release, which prints the not-migrated count, and lazily on first admin or public read as a fallback. Images soft-deleted before migration are kept in `retired[]`. Live images beyond 48 are dropped and their assets deleted.

## Validity Condition

The one-document approach **depends on the 6-album and 8-photo caps** keeping the gallery record small: at most 48 live photos plus the bounded retained deletes, read and rewritten whole on every action. If the caps are ever raised, this decision **must be revisited** before the change ships. Revisit the storage shape (Alternatives A or B), the retry policy and the retention bound, not just the constants.

## Consequences

### Positive

- **The caps hold by construction** under any interleaving of requests, without transactions, lock documents or counters. They can be proven with plain `Promise.all` DB tests (spec FR-035, SC-001/SC-002).
- **Reuses a proven pattern and store**: the same `settings` collection, `version` counter, cache tags (`settings`, `settings:gallery`) and public-read fallback as the rest of 005, so there's nothing new to operate.
- **The migration is atomic**: one document rewrite either happens entirely or not at all, and a concurrent second run just sees `schema: 2` and stops.
- **One writer path** removes the risk of the old flat-group save and the new album actions corrupting each other.
- **No false conflicts across albums**, since only detail edits are refuse-on-stale.

### Negative

- **Every gallery write serialises on one document.** Under heavy contention the 5 retries can run out, and the action returns `unavailable` with a "try again" toast. That's acceptable for a handful of admins, but this design would not scale to a large or high-write media library.
- **The whole gallery is read and rewritten on every action.** This is trivial at ≤ 48 photos plus bounded retained deletes (50 albums and 200 photos kept), but it is wasteful if the caps are ever raised a lot. Raising them is explicitly out of scope this phase, and doing so would reopen this ADR.
- **The gallery becomes a special case in Settings.** It lives in its own `src/lib/gallery` domain rather than the definition engine, so future engineers must know that "Settings" has two writing models. 005's tests that target the flat gallery must be rewritten or removed.
- **The lazy migration puts a possible write on the first read path** (admin or public). It runs outside the public cache and at most once, but it's a read-with-side-effect that must stay idempotent.
- **Discarding photos beyond 48 is destructive and irreversible.** This is the owner's explicit decision. The count is reported, but the images themselves aren't recoverable.

## Alternatives Considered

**A. Separate `galleryAlbums` and `galleryPhotos` collections, with a multi-document transaction per action.** This is the conventional relational-style model and scales to large galleries. Rejected: it needs replica-set transactions that 005 deliberately didn't assume, and it adds transaction retry handling. It also still needs a cross-document rule for "≤ 6 albums". The complexity isn't justified for 48 photos.

**B. One document per album, with an atomic conditional `$push` filtered on array length** (`{ "photos.7": { $exists: false } }`). This enforces the photo cap per album with no retries. Rejected: soft-deleted photos stay in the array, so array length ≠ live count. The 6-album cap would still need a separate counter document with `$inc` and a compensating rollback, which gives two mechanisms instead of one.

**C. Extend the 005 definition engine with a nested "list of lists" field type and keep the staged group Save.** This keeps one Settings model. Rejected: the engine has no nested lists, no per-action saving and no cross-writer caps, and uploads must be stored the moment they succeed (FR-016). Adding all of that would complicate every Settings group for one consumer, and a staged form can't decide a cap at action time.

**D. Refuse every action on any version mismatch (the 005 group rule), with no retries.** This is the simplest. Rejected: two admins uploading into *different* albums would keep failing each other with "changed by someone else", which is exactly the concurrent scenario the brief calls out.

**E. Enforce the caps only in the UI, with a best-effort server check (read the count, then insert).** Rejected: a check-then-insert race lets concurrent requests exceed the cap, which violates the brief and Constitution VI (no check-then-insert).

## References

- Feature Spec: [specs/007-gallery-albums/spec.md](../../specs/007-gallery-albums/spec.md) — FR-006, FR-011, FR-012, FR-019–FR-023, FR-026, FR-035; Clarifications
- Implementation Plan: [specs/007-gallery-albums/plan.md](../../specs/007-gallery-albums/plan.md) — Key Decisions 1–3, 5–7; Risks
- Research: [specs/007-gallery-albums/research.md](../../specs/007-gallery-albums/research.md) — R1, R2, R3, R4, R6, R7, R12
- Data Model: [specs/007-gallery-albums/data-model.md](../../specs/007-gallery-albums/data-model.md)
- Contracts: [specs/007-gallery-albums/contracts/gallery-actions.md](../../specs/007-gallery-albums/contracts/gallery-actions.md)
- Prior pattern: `specs/005-settings/research.md` R2 (one document per group, version compare-and-set); `src/lib/settings/mutations.ts`
- Constitution: `.specify/memory/constitution.md` — III (server-side enforcement), VI (Data Integrity: no check-then-insert, soft delete)
- Related ADRs: none conflicting (ADR-0001–0004 cover signup, notifications, careers and private document storage)

# ADR-0013: Settings Panels — Partial Saves Guarded by Per-Panel Fingerprints, One Save Action per Permission

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Proposed
- **Date:** 2026-10-17
- **Feature:** 014-page-settings (slice 1; slices 2–3 add panels on the same mechanism)
- **Context:** 014 reorganises admin Settings into one tab per public page, with each tab showing panels. The brief requires no data migration: every 005 group keeps its one stored record (`settings/_id = <group>`, with a `version` compare-and-set counter). It also puts one record under **two permissions**. The `admission` group holds the window dates and the "classes open for admission" list (both control whether parents can register, so they stay under **Settings**, per spec Q2) and the announcement and closed message (**Pages**). Whole groups also change permission: hero, video and stats move from Settings to Pages. Rules that apply to all three slices:
  - Two admins editing the **same panel** must not silently overwrite each other (the ADR-0005 compare-and-set pattern, with a "changed by someone else, reload" message).
  - Unsaved changes in one panel must never block another (FR-012).
  - Every save is logged with its panel.
  - Every save is checked on the server, and the access inventory (`src/test/access-inventory.test.ts`) must be able to prove which literal permission each entry point requires.

  Today one action, `saveSettingsGroup`, saves any whole group under `requireAdminAccess("settings")`, and the form sends the version it loaded. Transactions are not assumed (005).

<!-- Significance checklist
     1) Impact: yes. It defines how every Settings panel is saved and authorised, now and for slices 2–3 (Syllabi, Examination, Class Levels, page text).
     2) Alternatives: yes. Splitting the stored group, strict group CAS, client version hand-off, per-panel stored versions, and one dynamic-permission action were all viable.
     3) Scope: yes. It spans the panel registry, the mutations module, the Server Actions, the admin form, the permission model, the access inventory, the log and the users collection. -->

## Decision

One integrated cluster:

- **Panels are a registry over groups, not new storage.** `src/lib/settings/panels.ts` (pure, shared by client and server) maps each panel to a group and a list of that group's top-level fields, a save permission (`settings` | `pages`), a title, an admin anchor and a "View on site" address. Its invariants are unit-tested: every field is in exactly one panel, and every panel is in exactly one tab. `panelDefinition(panel)` derives a 005 `GroupDefinition` containing only the panel's fields and only the group rules wholly inside it. The same Zod schema is used for the form and the server.
- **A partial save is checked per panel and written per group.** The client sends `{ panel, expectedFingerprint, data }`. The server then:
  1. parses `data` with the panel definition, so keys outside the panel are dropped;
  2. reads the stored group and computes the **panel fingerprint**, the SHA-256 of the canonical JSON of the panel's live fields (defaults merged);
  3. refuses with `conflict` if the fingerprint differs from `expectedFingerprint`;
  4. merges the panel's fields into the stored live value, validates the whole group with its full schema, and reconciles soft-deleted items and verifies new images (as in 005);
  5. writes the **whole record** with the existing conditional update on `version` (or `create` at version 0);
  6. if that write misses because a sibling panel was saved in between, re-reads and repeats from step 2, at most 3 attempts in all, then `conflict`.

  The response carries the panel's new fingerprint. Fingerprints are never stored.
- **Per-panel save metadata.** An additive optional map `panelSaves.<panel> = { by, at }` on the record drives each panel's "Last saved" line. Older records fall back to `updatedBy`/`updatedAt`. `settings_saved` log lines gain `panel`.
- **One save action per permission.** `saveSettingsPanel` (`await requireAdminAccess("settings")`) and `savePagesPanel` (`await requireAdminAccess("pages")`) replace `saveSettingsGroup`, which is removed. Each action accepts only panels whose save permission matches its own. A mismatch returns `forbidden` and is logged as `access_denied`. The gallery actions and the upload signer move to `pages`.
- **Viewing versus saving.** Tabs have their own view access. The Admission tab uses a new non-grantable access value, `settings_or_pages`, which is also used by the Settings index page and the sidebar item. A panel the user can view but not save renders read-only (`<fieldset disabled>`, no Save button, a line naming the permission needed). The server refuses its save regardless.
- **No one loses access.** A one-time, idempotent script, `npm run grant:pages`, gives Pages to every non-deleted content manager who holds Settings. It uses a conditional `$addToSet` on the `user` collection filtered by `permissions: { $ne: "pages" }`, and writes a 011 `permissions_changed` entry (actor `system:014-grant-pages`) only when the update changed something. It runs before the deploy; it is harmless then, because no current code reads `pages`.

## Consequences

### Positive

- **The brief's rules hold on the server.** A save can never change a field outside its panel, a Pages-only user can never change the dates or classes by any request shape, and a Settings-only user can never change the messages.
- **No false conflicts between sibling panels.** An admin's own save of one panel never makes another panel stale, and another admin's save of a sibling panel is kept rather than overwritten.
- **Same-panel races are still refused.** They get the established "changed by someone else" message.
- **The stored record keeps one writer and one atomic write.** The group version still serialises every write; no transactions are needed, and 013's and 020's readers of the admission record are untouched.
- **No data migration.** The only stored additions are an optional map and one grant.
- **The access inventory can prove each permission.** Every entry point's permission stays a literal it checks (`perAccess` for the two actions).
- **Later slices extend the registry.** Slices 2–3 add panels with fields and a save permission; the save path, actions and guard don't change.

### Negative

- **More moving parts than a whole-group save.** There is a fingerprint helper, a merge step and a bounded retry loop. A bug in the merge could drop a sibling's fields, so it needs dedicated concurrency tests (both sibling orders, and a concurrent pair).
- **Under heavy contention on one group,** a save can fail after 3 attempts with a `conflict` even though its own panel was untouched. This is acceptable for a handful of admins, but the message ("reload") overstates the problem in that case.
- **A client can skip the conflict check.** It would have to send a fingerprint computed from current stored values, which means it has already seen them; it still needs the panel's permission, so the only person affected is that admin. Documented rather than prevented.
- **Two actions to keep aligned.** The client has to choose its action from the panel's save permission; a wrong choice is a visible `forbidden`, not a silent hole.
- **The access model gains a non-grantable compound value** (`settings_or_pages`). A future second compound need should prompt a general "any of" form instead of more named values.
- **A step can be missed at release.** If the deploy goes out before `grant:pages` runs, Settings-only content managers lose Home and Resources editing until it runs. The quickstart's release order and the script's safety on re-runs mitigate this.

## Alternatives Considered

- **Split `admission` into three stored groups (one per panel).** Each panel would then be an ordinary 005 group with its own version. Rejected because it is a data migration the brief forbids, and the 013 registration reader, the 020 window reader and the public shape mapper would all have to read three records.
- **Keep the group version as the only check (strict group compare-and-set).** Rejected: an admin's own save of the Admission messages would make their unsaved Admission window panel conflict (breaking FR-012), and unrelated panels of one record would block each other.
- **Group version check plus client hand-off.** After a save, sibling panels in the same browser adopt the new version. Rejected: if another admin changed panel B between B's load and A's save, B adopts a version that already includes that change and B's next save silently overwrites it, exactly what the brief forbids.
- **Per-panel version counters stored on the record.** Same behaviour as fingerprints, but it changes the stored shape, needs back-filling for existing records, and each new panel in later slices means a new counter. Fingerprints derive the same information from data already stored.
- **Client sends the original panel values instead of a fingerprint.** Same behaviour, with larger payloads, and the server would be deep-comparing untrusted structures. Rejected for clarity.
- **One save action that looks up the panel and calls `requireAdminAccess(panel.saveAccess)`.** Simpler call sites, but the permission becomes a runtime variable that the access inventory cannot verify. Rejected because Constitution III/XI require provable server checks.
- **Field-level permissions inside one group form**, with the server ignoring fields the user may not change. Rejected: it hides the permission split inside a form, leaves "ignored" edits on screen looking saved, and gives no read-only presentation.
- **Lazy grant (on login or first Settings visit) or relying on the main admin to re-grant by hand.** Rejected per spec Q3. A lazy grant spreads a one-time migration through hot paths; granting by hand risks some content managers silently losing access.

## References

- Feature Spec: [specs/014-page-settings/spec.md](../../specs/014-page-settings/spec.md) (Clarifications Q1–Q3; FR-009–FR-022a; US2, US4; edge cases)
- Implementation Plan: [specs/014-page-settings/plan.md](../../specs/014-page-settings/plan.md); research R2, R4, R5, R11, R13, R14 in [research.md](../../specs/014-page-settings/research.md); [data-model.md](../../specs/014-page-settings/data-model.md); [contracts/panel-actions.md](../../specs/014-page-settings/contracts/panel-actions.md); [contracts/access-matrix.md](../../specs/014-page-settings/contracts/access-matrix.md)
- Related ADRs: ADR-0005 (gallery single-document compare-and-set; the pattern this extends; the gallery itself is unchanged apart from moving to Pages), ADR-0011 (admission window evaluation; its stored fields become the Admission window panel, unchanged), ADR-0012 (registration data handling; registrations still read the class list from the same record)
- Evaluator Evidence: [history/prompts/014-page-settings/44-adr-settings-panels-partial-save.misc.prompt.md](../prompts/014-page-settings/44-adr-settings-panels-partial-save.misc.prompt.md)

# Contract: Manual scripts (014b)

Both are run by hand only, never from build, deploy, `postinstall` or startup (Constitution IV). Both print the connected database host and name first, taken from the Mongoose connection (never the connection string or a password).

## `npm run seed:sections -- <section> [--confirm]`

`scripts/seed-sections.ts` → `src/lib/settings/seed.ts`. `<section>` ∈ `syllabi | examination | portal-links`.

| Case | Output | Exit | Writes |
|---|---|---|---|
| unknown or missing `<section>` | usage line | 2 | none |
| data file fails the group schema | the field errors | 1 | none |
| stored live value has any content | "`<Section>` already has content; nothing written." | 1 | none |
| empty, no `--confirm` | counts, every item, adaptation report, (portal links) the insecure-URL list, "Dry run: nothing written. Add --confirm to write." | 0 | none |
| empty, `--confirm` | same summary + "Written." | 0 | the group document (compare-and-set on `version`), `pendingConfirmation: { source, seededAt }`, `updatedBy: "system:014b-seed"`; `settings_seeded` logged |
| empty, `--confirm`, but an admin saved in between (version moved) | "Changed while seeding; nothing written. Run again." | 1 | none |
| database unreachable | the error class only | 1 | none |

Seeded content appears publicly within the 60 s cache window.

Data files: `src/content/seed/{syllabi,examination,portal-links}.ts`, typed as the group's admin value without ids, plus `source` (the URL), `capturedOn` (date) and `adaptations: string[]`.

## `npm run migrate:class-levels [-- --confirm]`

`scripts/link-classes.ts` → `src/lib/settings/link-classes.ts`.

| Case | Output | Exit | Writes |
|---|---|---|---|
| no admission document, or no not-linked items | "Nothing to link." | 0 | none |
| no `--confirm` | "Would link: `<typed>` → `<level>`" per match; "Not linked: `<typed>`" per miss; "Duplicate: `<typed>` (level already linked)"; counts; "Dry run: nothing written." | 0 | none |
| `--confirm` | same lines with "Linked:"; counts | 0 | one compare-and-set write of the admission group (≤ 3 attempts): `levelId` and `name` on matched items only; `panelSaves["admission-classes"] = { by: "system:014b-link-classes", at }`; `classes_linked` logged |
| `--confirm`, nothing to link | "Nothing to link." | 0 | none (idempotent) |
| write keeps missing (3 attempts) | "Admission settings keep changing; nothing written. Run again." | 1 | none |

Matching: trim, collapse inner spaces, lower-case; only **live** Class Levels; a level is linked at most once.

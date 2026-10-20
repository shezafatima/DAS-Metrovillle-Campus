# Data Model: 020-admission

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Two kinds of data: one **database** Settings group (admin-edited) and **typed content files** (not edited until 014). Nothing else is stored.

---

## 1. Settings group `admission` (database)

Stored like every 005 group: one document in the `settings` collection, `_id: "admission"` (`src/models/settings.ts`). No model or index change. A group never saved reads as its defaults (all empty → **closed**).

| Key | Field type | Stored value | Default | Validation (one Zod schema, browser + server) |
|---|---|---|---|---|
| `opensOn` | `date` (new) | `"YYYY-MM-DD"` or `""` | `""` | `""` or a real calendar date |
| `closesOn` | `date` (new) | `"YYYY-MM-DD"` or `""` | `""` | `""` or a real calendar date; group rule `dateOrder(opensOn → closesOn)` |
| `announcement` | `text` | string | `""` | trimmed, ≤ 160 chars |
| `closedMessage` | `text` | string | `""` | trimmed, ≤ 160 chars |

Document envelope (unchanged): `version` (compare-and-set counter), `updatedBy` (editor's email), `updatedAt`.

**Group rule** `dateOrder`: when both `opensOn` and `closesOn` are non-empty and `closesOn < opensOn`, the save is refused with `{ "closesOn": <message> }`; nothing is written.

**Write path**: unchanged `saveSettingsGroup` Server Action → `requireAdminAccess("settings")` → `saveGroup` (CAS on `version`) → revalidate `settings`, `settings:admission` tags and `/` layout → `settings_saved` log line (`email`, `group`). Refusals keep their existing logging (`access_denied`).

### Public shape (`PublicShapes["admission"]`)

```ts
interface PublicAdmission {
  opensOn: string;        // "" when not set
  closesOn: string;       // "" when not set
  announcement: string;   // "" when not set (whitespace-only is saved as "" by trim)
  closedMessage: string;  // "" when not set
}
```

## 2. Admission window state (derived, never stored)

```ts
type AdmissionWindowState =
  | { kind: "open"; closesOn: string }      // opensOn <= today <= closesOn
  | { kind: "upcoming"; opensOn: string }   // both set, today < opensOn
  | { kind: "closed" };                     // a date empty, or today > closesOn
```

`today` = calendar date of `now` in `Asia/Karachi`.

| Stored dates | today (Karachi) | State | Settings status line | Public, above procedure |
|---|---|---|---|---|
| either empty | any | closed | "Closed" | closed message as quiet note, or nothing |
| both set | < opensOn | upcoming | "Opens on 1 January 2027" | as closed |
| both set | opensOn … closesOn | open | "Open now until 31 March 2027" | banner: announcement (if set) + "Applications close on 31 March 2027" |
| both set | > closesOn | closed | "Closed" | as closed |

Transitions happen only by time passing (00:00 Asia/Karachi) or by a save. "upcoming" is shown as closed to the public.

## 3. Registration-form flag (content file)

`src/content/admission/registration.ts`: `export const registrationFormExists = false;` — shipped `false`, deleted by 013. Read only by `isAdmissionApplyOpen()`.

## 4. Admission procedure (content file)

`src/content/admission/procedure.ts`, validated by `procedureSchema` in `src/lib/admission/schema.ts`.

```ts
type ProcedureBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string }                       // h4: "Nursery – PREP", "Class-I Onward", "Note", "Rules of Payment"
  | { type: "bullets"; items: string[] }                       // <ul>
  | { type: "numbered"; items: string[] }                      // <ol> (Rules of Payment)
  | { type: "steps"; steps: ProcedureStep[] };                 // <ol> (Admission Formalities 1–7)

interface ProcedureStep {
  id: string;
  text: string;                                                 // without the "1. " prefix (the list numbers it)
  bullets?: string[];                                           // nested <ul>
  fees?: { letter: string; name: string; note: string }[];      // step 6 only → <table>
}

interface ProcedureSection {
  id: string;            // "eligibility" | "register-for-admission-test" | "admission-test" | "admission-formalities"
  heading: string;       // verbatim incl. number: "1. Eligibility"
  intro: string;         // the step's intro line, shown centred under the heading (spec V2)
  blocks: ProcedureBlock[];
}

interface AdmissionProcedure {
  source: "https://das.edu.pk/admission/";
  sections: ProcedureSection[];   // exactly 4, in reference order
}
```

Validation: all strings non-empty and trimmed; exactly four sections; ids unique. Text is verbatim from `docs/content-source/admission/procedure.txt`.

## 5. Uniform (content file)

`src/content/admission/uniform.ts`, validated by `uniformSchema`. The shape is the brief's contract for 014.

```ts
interface UniformGroup {
  id: string;                       // "kids-boys", "kids-girls", "hifz-boys", "senior-boys", "senior-girls" (no Hifz girls: spec V8)
  category: string;                 // verbatim: "Kids Uniform", "Hifz Students’ Uniform", "Senior Students’ Uniform"
  gender: "Boys" | "Girls";         // verbatim headings
  items: string[];                  // verbatim, exactly as on the reference (5 each today)
  image?: { src: string; alt: string };  // src under /images/admission/uniform/; absent for Hifz
}

interface UniformContent {
  source: "https://das.edu.pk/admission/uniform/";
  uniform: UniformGroup[];          // at least 1, in reference order (5 today)
}
```

Validation: ids unique; `items` non-empty; `image.src` must start with `/images/admission/uniform/` (no remote hosts); `image.alt` non-empty.

Card heading derived for display (not stored): `${category} – ${gender}`, e.g. "Kids Uniform – Boys". Visually the category is a small label above the gender; the " – " is screen-reader-only. No separate title map exists, so there is no second copy of the text to drift.

## 6. Review markers (content file)

`src/content/admission/index.ts` exports `admissionReviews` with `status: "pending-client-approval"` for `procedure` and `uniform`, carrying the spec's client questions (campus applicability, age criteria per class, tuition monthly vs every two months, senior girls' qamiz, Hifz photos).

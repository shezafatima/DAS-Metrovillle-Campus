# Data Model: 013 Student Registration

**Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

## Write rule (Constitution VI)

`studentRegistrations` has **no natural key**. Each valid submission inserts a new record. Nothing is refused, merged or upserted because of a shared email, phone or student. Repeats are surfaced by the computed likely-duplicate flag (research §7). The only database-enforced uniqueness is `reference`. Recorded in the feature ADR.

---

## StudentRegistration — collection `studentRegistrations`

Mongoose model `src/models/student-registration.ts`, with `softDeletePlugin` and `timestamps: true` (`createdAt` = submitted at).

| Field | Type | Rules / notes |
|---|---|---|
| `_id` | ObjectId | |
| `reference` | string | 8 chars from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`; **unique index** |
| `studentName` | string | 2–100 after clean-up; Urdu allowed |
| `fatherName` | string | 2–100 |
| `motherName` | string | 2–100 |
| `email` | string | lower-cased, ≤ 254 |
| `dateOfBirth` | string | `YYYY-MM-DD` (calendar date, no time zone); age 2–18 on the submission day (Pakistan) |
| `fatherMobile` | string \| null | `+923XXXXXXXXX` |
| `motherMobile` | string \| null | same; at least one of the two is non-null |
| `address` | string | 10–300 |
| `emergencyContact` | `{ name: string; phone: string }` | name 2–100; phone `+923XXXXXXXXX` |
| `className` | string | as chosen; must be in the Settings list **at submission time**; 1–50 |
| `motherTongue` | enum | `urdu \| english \| sindhi \| punjabi \| pashto \| balochi \| saraiki \| other` |
| `motherTongueOther` | string \| null | 2–50 when `other`, else null |
| `vaccinated` | boolean | **health** |
| `medicalHistory` | string \| null | ≤ 1000; **health** |
| `referenceStudent` | `{ name; className; relation }` \| null | all three 2–100 or the whole object null; **sensitive** |
| `remarks` | string \| null | ≤ 1000 |
| `consentAt` | Date | server time at save |
| `status` | enum | `new \| contacted \| admitted \| not_admitted`; default `new` |
| `history` | `HistoryEntry[]` | see below |
| `duplicateKey` | string \| null | sha256 hex of `nfc(lower(collapse(studentName))) \| dateOfBirth \| fatherMobile`; null when no father's mobile |
| `deletedAt` | Date \| null | plugin |
| `deletedBy` | ObjectId \| null | admin user id |
| `createdAt` / `updatedAt` | Date | timestamps |

Not stored on purpose: the visitor's IP, user agent and the raw request body.

**HistoryEntry** (embedded): `{ at: Date; action: "status" | "deleted" | "restored"; from?: Status; to?: Status; byUserId: ObjectId; byEmail: string }`.

### Indexes

| Index | Purpose |
|---|---|
| `{ reference: 1 }` unique | collision-proof reference |
| `{ createdAt: -1, _id: -1 }` | list order, retention sweep |
| `{ className: 1, createdAt: -1 }` | class filter |
| `{ duplicateKey: 1 }` (sparse) | duplicate counts |
| `{ deletedAt: 1 }` | plugin (exists); Deleted view and grace sweep |

Name search is a case-insensitive regex over three fields on a small collection (hundreds per year), as careers does. No text index.

### Lifecycle

```text
            submit (window open, class listed)
                        │
                        ▼
   ┌──────────── LIVE (status: new → contacted / admitted / not_admitted, any order) ────────────┐
   │  delete (main admin, confirmed)                          createdAt < retention cutoff        │
   ▼                                                                       │                        │
 DELETED (deletedAt set) ── restore (main admin, ≤ 30 days, within retention) ─► LIVE              │
   │                                                                       │                        │
   └── deletedAt < now − 30 days ─────────────► PERMANENTLY REMOVED ◄──────┘◄───────────────────────┘
                                                (sweep: hard delete, history goes with it)
```

- Status can change in any direction. It doesn't affect visibility, retention or notifications.
- "Days left" in the Deleted view = min(deletedAt + 30 days, createdAt + retention) − now, rounded up to whole days.

### Visibility by surface

| Surface | Fields |
|---|---|
| Public response | `reference` only (on its own confirmation) |
| Admin list | reference, studentName, className, fatherName, one mobile (father's, else mother's), createdAt, duplicate flag |
| Deleted view | reference, studentName, className, deletedAt, days left |
| Notification / Overview | reference, className, createdAt; counts |
| Admin detail | everything, with `vaccinated` + `medicalHistory` in the Health block; history |
| CSV | every field except `history`, `duplicateKey`, `deletedBy`; plus status and a "Likely duplicate" column |
| Logs | registration `_id` only |

---

## RegistrationExport — collection `registrationExports`

Model `src/models/registration-export.ts`. No soft delete; removed by the sweep after the retention period.

| Field | Type | Notes |
|---|---|---|
| `at` | Date | indexed |
| `byUserId` | ObjectId | |
| `byEmail` | string | the admin's email at the time |
| `rows` | number | rows in the file |
| `classFilter` | string \| null | the class filter used |
| `searched` | boolean | whether a search term was applied (the term itself is **not** stored) |

---

## Settings → Admission (group `admission`, extended)

| Key | Type | Rules |
|---|---|---|
| `classes` | list of `{ id: uuid, name: string, deletedAt: null }` | name required, 1–50 after clean-up; ≤ 30 items; unique ignoring case and spaces (`uniqueText` rule); order kept; default `[]` |

`PublicAdmission.classes: string[]` holds the live item names in saved order.

---

## AdminNotificationState (extended)

| Field | Type | Notes |
|---|---|---|
| `registrationsLastOpenedAt` | Date | filled lazily on first read (same `$ifNull` pipeline as careers); updated by `POST /api/admin/registrations/opened` |

A registration is "new" for the main admin when `createdAt > registrationsLastOpenedAt` and it isn't deleted.

---

## Throttle keys (existing `rateLimits` collection)

| Key | Policy |
|---|---|
| `form:registration:ip:<ip>` | 5 per 600 s (`PUBLIC_FORM_POLICY`) |
| `sweep:registrations` | 1 per 3600 s |

---

## Content and constants

- `src/content/registration.ts`: page copy, section legends, field labels and hints, messages, mother-tongue options, status labels, privacy notice (`placeholder: true`) with a `{months}` slot, consent label, closed default line, confirmation text.
- `src/lib/registration/rules.ts`: `REGISTRATION_DELETE_GRACE_DAYS = 30`, `MIN_AGE = 2`, `MAX_AGE = 18`, `REFERENCE_ALPHABET`, `REFERENCE_LENGTH = 8`, status keys.
- Env `REGISTRATION_RETENTION_MONTHS`: 1–120, default 12; must be set explicitly for production (release gate).
- Removed: `src/content/admission/registration.ts` (`registrationFormExists`).

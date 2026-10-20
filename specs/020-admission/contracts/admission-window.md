# Contract: Admission window module

**Files**: `src/lib/admission/window.ts` (pure functions) and `src/lib/admission/server.ts` (server-only functions, `import "server-only"`) · **Consumers**: `/admission` page, `/admin/settings/admission` page, 013 registration submit action.

## Pure functions (no I/O; importable anywhere, unit-tested)

```ts
/** Calendar date "YYYY-MM-DD" of `now` in Asia/Karachi. */
export function karachiToday(now: Date): string;

/** The window state at `now`. Never throws; malformed dates count as empty (closed). */
export function admissionWindowState(
  value: { opensOn: string; closesOn: string },
  now: Date,
): AdmissionWindowState; // see data-model.md §2

/** "31 March 2027" for "2027-03-31" (en-GB, month spelled out). */
export function formatAdmissionDate(isoDate: string): string;

/** Settings status line: "Open now until …" | "Opens on …" | "Closed". Copy from src/content/admin.ts. */
export function admissionStatusText(state: AdmissionWindowState): string;
```

Guarantees:
- Open iff both dates set and `opensOn <= karachiToday(now) <= closesOn`.
- Result depends only on arguments (not on the process `TZ`).
- `admissionWindowState` is the **only** implementation of the open/closed rule (FR-013).

## Server-only functions

```ts
import "server-only";

export interface AdmissionWindow {
  state: AdmissionWindowState;
  announcement: string;   // "" when unset
  closedMessage: string;  // "" when unset
}

/**
 * Awaits connection() (never pre-rendered or cached), reads the cached public
 * Settings group "admission", and evaluates the state at the current instant.
 * Test-only: when freshReadsForTests() is true, an `e2e-now` cookie (ISO
 * instant) replaces the current time. Ignored in production.
 */
export async function getAdmissionWindow(): Promise<AdmissionWindow>;

/**
 * The ONE switch for the Apply Now button (FR-017, FR-018):
 * window open AND registrationFormExists (src/content/admission/registration.ts).
 * 013 deletes the constant and keeps the window check.
 */
export async function isAdmissionApplyOpen(): Promise<boolean>;
```

Failure behaviour: if the Settings read fails, `getPublicSettings` returns the last good value or the defaults (empty dates) → state `closed`. The page never errors because of the window.

## Test matrix (Vitest, `window.test.ts`)

| Case | opensOn | closesOn | now (UTC) | Expected |
|---|---|---|---|---|
| empty both | "" | "" | any | closed |
| empty open | "" | 2027-03-31 | any | closed |
| empty close | 2027-01-01 | "" | any | closed |
| last second before start | 2027-01-01 | 2027-03-31 | 2026-12-31T18:59:59Z | upcoming |
| first second of start | 2027-01-01 | 2027-03-31 | 2026-12-31T19:00:00Z | open |
| last second of end | 2027-01-01 | 2027-03-31 | 2027-03-31T18:59:59Z | open |
| first second after end | 2027-01-01 | 2027-03-31 | 2027-03-31T19:00:00Z | closed |
| same-day window | 2027-01-15 | 2027-01-15 | 2027-01-15T06:00:00Z | open |
| malformed stored date | "2027-02-30" | 2027-03-31 | any | closed |
| `isAdmissionApplyOpen`, flag false | open window | | | false |
| `isAdmissionApplyOpen`, flag true (module mock) | open / closed | | | true / false |

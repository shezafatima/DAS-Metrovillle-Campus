# ADR-0011: Admission Window Evaluation — Request-Time Decision on Pakistan Calendar Days, One Shared Function

- **Status:** Accepted (approved by the requester, 2026-10-14)
- **Date:** 2026-10-14
- **Feature:** 020-admission (consumed by 013-student-registration)
- **Context:** Admins set an admission window in Settings (Opens on, Closes on, plus an announcement and a closed message). The public `/admission` page must show a banner only between the dates, and the window must switch on and off by itself at midnight Pakistan time with no save or redeploy (spec FR-011, FR-016). The same window must later gate the Apply Now button and, in 013, the server's acceptance of registration submissions. Today the public site caches: the public layout uses ISR (`revalidate = 60`), and Settings reads are cached for 60 s and refreshed on save (`src/lib/settings/public.ts`). A cached "open" or "closed" answer would go stale exactly at midnight, when nothing calls the cache. The project runs Next 16.3 without Cache Components, has no scheduler, and the stack is fixed (Constitution II).

<!-- Significance checklist
     1) Impact: yes. It sets how time-dependent public state is rendered, and the registration gate (013) is built on it.
     2) Alternatives: yes. ISR, a scheduled revalidation, and a client-side decision were all viable.
     3) Scope: yes. It spans the Settings engine, the public page, the admin screen, 013's server action, and the test tooling. -->

## Decision

- **Stored form:** Opens on and Closes on are plain calendar dates, stored as `"YYYY-MM-DD"` strings (`""` when empty) in the Settings group `admission`. To support this, the 005 Settings engine gains a `date` field type and a group-level `dateOrder` rule (Closes on ≥ Opens on), enforced by the one Zod schema shared by the admin form and the Server Action.
- **Day rule:** today = the calendar date of "now" in `Asia/Karachi`, computed with `Intl.DateTimeFormat` and an explicit time zone. The window is open when both dates are set and `opensOn ≤ today ≤ closesOn` (string comparison, inclusive). If either date is empty, it is closed.
- **One implementation:** the pure `admissionWindowState(value, now)` in `src/lib/admission/window.ts` is the only open/closed rule. Server-only `getAdmissionWindow()` (in `src/lib/admission/server.ts`) wraps it with the Settings read and the current time. `isAdmissionApplyOpen()` = window open **and** the `registrationFormExists` content constant (shipped `false`, deleted by 013). The public page, the Settings status line ("Open now until …" / "Opens on …" / "Closed") and 013's submit action all call these functions.
- **Request-time evaluation:** `/admission` calls `await connection()`, so it is rendered per request and never pre-rendered or cached. The **saved dates** still come through the existing cached Settings reader, because every save already revalidates its tag. Only the **decision** is computed per request, so the first request after 00:00 PKT shows the new state.
- **Testability:** a test-only `e2e-now` cookie replaces "now" inside `getAdmissionWindow()`, only when `freshReadsForTests()` is true (never in production). This lets Playwright prove the 23:59 / 00:00 switch on the real page. Vitest covers exact boundary instants on the pure function.
- **Failure mode:** if the Settings read fails, the existing fallback (last good value, else defaults with empty dates) yields **closed**, never a wrong "open".

## Consequences

### Positive

- The state changes exactly at Pakistan midnight with no cron, job, or redeploy, and does not depend on site traffic.
- No time-zone off-by-one errors: a calendar date has no zone, and only the "today" calculation touches one.
- One rule shared by the admin status line, the public banner, the Apply button and 013's server-side refusal, so they cannot disagree.
- The cached Settings read is kept, so per-request rendering costs pure date math and a cache hit, not a database round trip.
- The engine additions (a date field and a two-field rule) are reusable by later Settings groups.

### Negative

- `/admission` loses static or ISR delivery: every visit is a server render (small, but not free, and not served from the CDN as HTML).
- Request-time evaluation must be kept: if a later change pre-renders the page or caches the decision (e.g. enabling Cache Components without moving to `io()`/`connection()` semantics), the midnight switch silently breaks. Guarded by the build route table check (`/admission` must be ƒ) and the E2E switch test.
- A test-only cookie path exists in production code (inert in production, but it is code to keep correct).
- Storing dates as strings means any future time-of-day window (e.g. "closes at 17:00") needs a data change.

## Alternatives Considered

- **ISR (`revalidate = 60`), like the public layout:** rejected. Stale-while-revalidate serves the old state to the first visitor after midnight, and on a quiet site possibly for much longer. Correctness would depend on traffic.
- **Scheduled revalidation at 00:00 PKT (cron calling `revalidatePath`):** rejected. It needs a scheduler outside the fixed stack, fails silently if a run is missed, and still needs the same date rule.
- **Decide in the browser (a client island comparing the dates with the visitor's clock):** rejected. The visitor's clock and zone are untrusted, there is no banner without JavaScript and there is a layout shift on load, and 013 needs the decision on the server anyway.
- **Store `Date` instants (Karachi midnight in UTC) instead of calendar strings:** rejected. It needs conversion at every edge and invites off-by-one-day bugs. A fixed +05:00 offset instead of `Intl` was rejected for the same robustness reason, even though Pakistan has no DST today.
- **A one-off admin form for the window instead of extending the 005 engine:** rejected. It breaks the "no per-group form" design and the Constitution VIII editing model.

## References

- Feature Spec: [specs/020-admission/spec.md](../../specs/020-admission/spec.md) (FR-008–FR-019, SC-005)
- Implementation Plan: [specs/020-admission/plan.md](../../specs/020-admission/plan.md)
- Research: [specs/020-admission/research.md](../../specs/020-admission/research.md) R1–R6
- Contracts: [admission-window.md](../../specs/020-admission/contracts/admission-window.md), [settings-admission-group.md](../../specs/020-admission/contracts/settings-admission-group.md)
- Related ADRs: ADR-0009 (single pages with anchored sections; `/admission/register` stays a real page, consistent with this decision)
- Evaluator Evidence: [history/prompts/020-admission/25-admission-plan-and-adr.plan.prompt.md](../prompts/020-admission/25-admission-plan-and-adr.plan.prompt.md)

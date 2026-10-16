# Contract: `/admission/register` page and the Apply Now switch

## Server page `src/app/(public)/admission/register/page.tsx`

- Calls `getRegistrationAvailability()` once per request (dynamic: `connection()` inside 020's reader). Triggers `after(maybeSweepRegistrations)`.
- Metadata title: "Student Registration".
- Renders `PageBanner` (Admission banner) and then either:
  - **Closed** (`open === false`): `RegistrationClosed` shows `closedMessage` or the default line "Admissions are currently closed.", plus a link back to /admission. No form, no form fields in the DOM.
  - **Open**: `RegistrationForm` with props `{ classes: string[]; today: "YYYY-MM-DD"; retentionMonths: number }`.

## `RegistrationForm` (client)

- Six `fieldset`s with `legend`s, in order: Student (student name, date of birth, class), Parents (father's name, mother's name, father's mobile, mother's mobile), Contact & address (email, address, emergency contact name, emergency contact phone), Health (vaccinated radio Yes/No, medical history + helper text, mother tongue + Other), Reference (name, class, relation + group hint), Remarks (remarks).
  - Mother tongue sits with Student if the token pass shows a better fit. The legend order above stays as the spec lists.
- Grid: one column below `md` (768px), two from `md`. Text areas span both columns.
- Privacy notice paragraph (months interpolated) → consent checkbox → submit button.
- Hidden honeypot `website` input (`HONEYPOT_FIELD`, `.signup-honeypot`).
- Client validation uses the same `buildRegistrationSchema({ classes, today })`. Errors appear under each field (`aria-invalid`, `aria-describedby`), and focus moves to the first invalid field.
- Responses:
  - 200 → reset values, show `RegistrationConfirmation` (`role="status"`, focus): "Registration received. Your reference number is **K7MQ2XRT**. Please keep it; the school office will ask for it."
  - 400 → field errors.
  - 403 → banner with the closed message.
  - 429 → banner "Too many attempts. Please try again in a few minutes."
  - 503 / network → banner "Something went wrong. Please try again."
  - Every failure keeps all values.
- Error text uses the shared public-form error class (`font-body`; research §5a).

## Apply Now (020)

- `isAdmissionApplyOpen()` returns `(await getRegistrationAvailability()).open`.
- `ApplyButton` on /admission is unchanged. It renders one link to `/admission/register` only when that is true.
- `src/content/admission/registration.ts` is deleted; 020's tests that toggled the constant are rewritten to set Settings (window + classes).

## Accessibility and layout

- axe: zero violations with the page open and closed (`e2e/registration-public.spec.ts`).
- No horizontal scroll at 375, 768, 1024 and 1440px. Two columns from 768px.

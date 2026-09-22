# Contract: `SignupSection` component and its content

**Feature**: 004-signup | Consumers: this feature (Home placeholder), 006 Home, 009 Resources

## Component API

```tsx
import { SignupSection } from "@/components/signup/signup-section";

<SignupSection source="home" />        // 004 (Home placeholder) and 006
<SignupSection source="resources" />   // 009
```

| Prop | Type | Required | Notes |
|---|---|---|---|
| `source` | `SignupSource` (`"home"` \| `"resources"`) | yes | Recorded on the signup as the page it came from; also sent as `source` to the public route. Type comes from `src/lib/signup/sources.ts`. |
| `id` | string | no | Optional anchor id for host pages that link to the section (default `"signup"`). |

The section is a Server Component: a full-bleed band with the heading,
supporting line, the `SignupForm` client component, and the usage
note. It reads all copy from `src/content/signup.ts`. It has no other
props — host pages do not restyle it (Constitution VI).

Structure (desktop, per reference `screenshots/das.edu.pk_.png`):

```
<section id="signup" aria-labelledby="signup-heading" class="signup-band">
  <div class="container">
    <h2 id="signup-heading">Join Over <span class="highlight">300,000</span> Students …</h2>
    <p class="supporting">Become Part of …</p>
    <SignupForm source=… />          ← [Name] [Email] [Phone] [Signup]
    <p class="note">We will only use …</p>
  </div>
</section>
```

Layout by width (spec clarification Q2): 375px single column, all
full-width; 768px three fields in one row, button full-width below,
centred; ≥ 1024px fields and button in one row as the reference.

## `SignupForm` (client)

Internal to the section; not exported for host pages. Renders:

- Three `<input>`s with `sr-only` `<label>`s at every width (the
  reference shows placeholders only; the placeholders "Name", "Email",
  "Phone" are the visual label), `name`/`email`/`tel` input types,
  `autoComplete` `name`/`email`/`tel`, `required`, `maxLength` 100/254,
  `aria-invalid` + `aria-describedby` → the field's message element.
- Honeypot `<input name="website_url">` with `tabIndex={-1}`,
  `aria-hidden="true"`, `autoComplete="off"`, visually removed via the
  `signup-honeypot` class (off-screen, not `display:none`), inside a
  wrapper with `aria-hidden`.
- A submit button labelled "Signup" (copy from content), disabled while
  submitting with a spinner.
- A live region (`role="status"`) that announces the thank-you or the
  banner error.

States: `idle` → `submitting` → `success` | `error(fields)` |
`error(rate-limited)` | `error(unavailable)`. On `success` the inputs
are cleared and replaced by the thank-you block with a "Sign up someone
else" button that returns to `idle`.

## Content (`src/content/signup.ts`)

```ts
export interface SignupCopy {
  heading: { before: string; highlight: string; after: string; placeholder: boolean };
  supporting: { text: string; placeholder: boolean };
  note: { text: string; placeholder: boolean };
  fields: { name: string; email: string; phone: string };        // labels = placeholders
  submit: string;                                                 // "Signup"
  submitting: string;
  success: { title: string; body: string; again: string };
  errors: { rateLimited: string; unavailable: string };
  // field validation messages live in the shared Zod schema, not here
}
export const signupCopy: SignupCopy;
```

Placeholder values (until the client supplies copy; each marked with a
comment and `placeholder: true`, rendered with `data-placeholder="true"`):

- heading: "Join Over " + "300,000" + " Students Enjoying Dar-e-Arqam School Now"
- supporting: "Become Part of Dar-e-Arqam Schools to Further Your Career."
- note: "We will only use these details to contact you about admissions and school updates."

Admin-side copy (`signupsCopy` in `src/content/admin.ts`): page title,
table headers, filter labels, source labels come from
`SIGNUP_SOURCES`, empty state, delete dialog text, toasts
(deleted / no longer available / unavailable), export button label,
pagination labels (shared with news via `AdminPagination`'s `copy` prop).

## Design tokens (added by the extraction pass, research §11)

Consumed only through named tokens in `src/app/globals.css` `@theme`:

`--color-signup-band`, `--color-signup-heading`,
`--color-signup-highlight`, `--color-signup-supporting`,
`--color-signup-input-bg`, `--color-signup-input-placeholder`,
`--color-signup-note`, `--text-signup-heading` (+ `--line-height`,
`--font-weight`), `--text-signup-supporting`, `--text-signup-input`,
`--text-signup-button`, `--spacing-signup-band-y`,
`--spacing-signup-input-height`, `--spacing-signup-gap`,
`--radius-signup-input`, `--radius-signup-button`. Button colours reuse
the existing `color-cta` red and its navy hover from
`design-tokens.md`. Exact values are filled in by the extraction task;
this list is the contract for names, not values.

Form-state colours are **general** tokens, not signup-specific, so the
contact form (008) and the admin can reuse them: `--color-error`
(`#F44336`, the reference CTA red) and `--color-success` (`#00BCD4`,
the reference accent cyan) — recorded as a deviation in the spec since
the reference has no error/success state. Labels are `sr-only` at
every width; the placeholder is the visual label, as on the reference.

## Anchor

`#signup` is the cross-page anchor id owned by this spec
(`docs/architecture.md` "Cross-page anchor IDs are defined in the
owning spec"). 006/009 may link to it; it is not renamed.

# Contract — Public `/careers` page and entry points

`src/app/(public)/careers/page.tsx` (Server Component) composes:

1. `PageBanner` — title "Careers", breadcrumb Home › Careers (shared 008 component).
2. `CareersIntro` — static copy from `src/content/careers.ts` (`intro.heading`, `intro.paragraphs[]`), the shape of a future 014 page-content row.
3. `CareersFormSection` → `CareersForm` (client) — the form band, using the contact-form tokens.

Metadata: title "Careers", description from content, canonical `/careers`.

## Form layout (one grid)

| Width | Grid |
|---|---|
| < 768px | 1 column: name, email, phone, qualification, CV, notice + consent, button |
| ≥ 768px | 2 columns, the contact form's gaps: [name][email] / [phone][qualification] / [CV, spans 2] / [notice + consent, spans 2] / [button, spans 2] |

- Labels visually hidden, placeholders shown (contact form pattern). The CV control is a native `<input type="file" accept="application/pdf,.pdf">` styled as a field row with a visible "Choose your CV (PDF, max 4 MB)" label and the chosen file name; keyboard and screen-reader operable.
- Each error sits directly under its field, linked with `aria-describedby`; the first invalid field is focused on submit.
- Privacy notice from `careersCopy.privacy.notice` (`placeholder: true` until the client supplies wording); consent checkbox label `careersCopy.privacy.consentLabel`.
- `dir="auto"` on name and qualification (Urdu).
- Every value from `research/design-tokens.md`; a missing value is extracted and added as a token first.

## Copy (`src/content/careers.ts`)

`careersCopy = { banner, intro, form: { placeholders, cvLabel, submit, sending }, privacy: { notice, consentLabel, placeholder }, success: { title, body }, errors: { alreadyApplied, rateLimited, tryAgain }, fieldErrors }`

## Entry points

- Top bar: `portalLinks` gets `{ label: "Careers", href: "/careers" }` as its first item (`src/content/site-shell.ts`), shown at every width by the existing TopBar list.
- Footer: a "Careers" link in the bottom bar beside the copyright (`footerContent.links`).
- Main menu unchanged (8 items). Home "Join Now" already links to `/careers` (006).
- `src/lib/site-search.ts` index gets a "Careers" entry.

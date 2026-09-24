# Contract: Contact page components and content

**Feature**: 008-contact-messages | **Route**: `/contact` (public, inside `PublicShell`)

`src/app/(public)/contact/page.tsx` composes sections only
(Constitution VI) and replaces the 001 `PagePlaceholder`:

```tsx
export default async function ContactPage() {
  const details = await getContactDetails();          // src/lib/contact-details.ts
  return (
    <>
      <ContactBanner />                                // title "Contact", breadcrumb Home » Contact
      <ContactDetails details={details} />             // 4 columns
      <ContactMap address={details.address} mapUrl={details.mapUrl} />
      <ContactFormSection />                           // yellow band, id="contact-form"
    </>
  );
}
```

`metadata = { title: "Contact" }`.

## Components (`src/components/contact/`)

| Component | Kind | Props | Renders |
|---|---|---|---|
| `ContactBanner` | server | — | Banner with the extracted background image, yellow "Contact" `h1`, breadcrumb nav. Becomes a `PageBanner` usage if the extracted values match the News banner (research §14). |
| `ContactDetails` | server | `details: ContactInfo` | Grid of 4 `ContactDetailColumn`: 4 columns from `lg:`, 1 centred column below (reference 375 + 768 both stack). |
| `ContactDetailColumn` | server | `icon: {src,alt}`, `heading`, `subtitle`, `children` | Illustration (`next/image`, fixed token size), uppercase heading, letter-spaced subtitle, body. |
| `ContactMap` | server | `address`, `mapUrl` | `h2` "Locate Us on Google Maps"; a map area with a fixed token size from the first render (`relative w-full h-(--spacing-contact-map-height) bg-surface`, white, as in the reference captures), containing `<LazyMapFrame>`; always-present caption: address + "Open in Google Maps" link (`mapUrl`, new tab). |
| `LazyMapFrame` | client | `src`, `title` | Nothing until an `IntersectionObserver` reports the reserved area in view, then an `<iframe>` (`absolute inset-0 size-full border-0`, `loading="lazy"`) — no map request before that, no layout shift after (FR-024a, SC-012). |
| `ContactFormSection` | server | — | Full-width band (`id="contact-form"`, `aria-labelledby` a visually hidden "Send us a message" heading), container, `<ContactForm />`. |
| `ContactForm` | client | — | Fields, honeypot, states (public contract "Client"). |
| `WriteUsLink` | client | — | `<a href="#contact-form">` + click handler focusing `#contact-name`. |

Column contents (static copy from `src/content/contact.ts`; values
from `ContactInfo`):

| Column | Heading | Subtitle | Body |
|---|---|---|---|
| By Phone | "BY PHONE" | `details.officeHours` (placeholder-marked) | `<a href="tel:{details.phone}">{details.phone}</a>` — the value as stored, the same `href` the 001 footer uses |
| By Email | "BY EMAIL" | "Write email on any of the following addresses" | `<a href="mailto:…">{details.email}</a>` |
| Visit Us | "VISIT US" | "Visit us in person and meet our representative" | `{details.address}` |
| Write Us | "WRITE US" | "Write us an inquiry by filling form below" | `<WriteUsLink>Click this link to view inquiry form</WriteUsLink>` |

## Form layout

| Width | Layout |
|---|---|
| < `md` (375) | Name, Email, Phone, Subject, Message, Send — one column |
| ≥ `md` (768, 1024, 1440) | Row 1 Name \| Email · Row 2 Phone \| Subject · Message full width · Send full width |

Labels: the reference uses placeholders only ("Name", "Email", "Your
Message"). Placeholders are kept for fidelity **and** each input has an
accessible name via a visually hidden `<label>` (FR-009). Phone's
placeholder reads "Phone (optional)"; Subject's "Subject". Field
messages sit directly under their input (`--color-error`), linked with
`aria-describedby`; the counter is `aria-live="polite"` only when
within 10% of the limit.

## Content (`src/content/contact.ts`)

```ts
export const contactCopy = {
  banner: { title: "Contact", breadcrumbHome: "Home" },
  columns: { phone: {...}, email: {...}, visit: {...}, write: {...} },  // heading, subtitle, icon src/alt
  map: { heading: "Locate Us on Google Maps", openInMaps: "Open in Google Maps", iframeTitle: (address) => `Map showing ${address}` },
  form: {
    heading: "Send us a message",                     // visually hidden
    placeholders: { name: "Name", email: "Email", phone: "Phone (optional)", subject: "Subject", message: "Your Message" },
    submit: "Send", sending: "Sending…",
    counter: (n: number, max: number) => `${n.toLocaleString("en")} / ${max.toLocaleString("en")}`,
    success: { title: "Thank you for your message!", body: "We have received your enquiry and will get back to you soon.", again: "Send another message" },
    errors: { rateLimited: "Too many messages — please try again shortly.", unavailable: "We couldn't send your message right now. Please try again in a moment." },
  },
} as const;
```

The thank-you copy is placeholder-marked (client may supply final
wording). Contact values (`phone`, `email`, `address`, `mapUrl`,
`officeHours`) live in `contactInfo` (`src/content/site-shell.ts`), not
here — that is the Settings-shaped source (data-model "Contact
details").

## Tokens

All values come from the contact extraction pass (research §15) as
`--*-contact-*` tokens in `design-tokens.md` + `@theme`, reusing
existing ones where equal. Expected names (final list set by the
extraction output, never guessed):

`--color-contact-form-band`, `--spacing-contact-form-band-y`,
`--spacing-contact-input-height`, `--spacing-contact-textarea-height`,
`--color-contact-input-border`, `--color-contact-input-placeholder`,
`--text-contact-input`, `--spacing-contact-form-gap`,
`--radius-contact-input`, `--text-contact-column-heading`,
`--text-contact-column-subtitle` (incl. letter-spacing),
`--text-contact-column-body`, `--spacing-contact-icon`,
`--spacing-contact-columns-gap`, `--text-contact-map-heading`,
`--color-contact-map-heading`, `--spacing-contact-map-height`,
banner tokens (or News banner reuse).

## Assets

`public/images/contact/{by-phone,by-email,visit-us,write-us}.<ext>` and
`public/images/contact/banner.<ext>` — downloaded by the extraction
script from the URLs it records; source URLs logged in
`design-tokens.md`.

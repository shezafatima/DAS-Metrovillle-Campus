/**
 * Public copy for the signup section (Constitution VI — page copy
 * lives in content files, not hardcoded inside components). The
 * heading, supporting line and usage note are placeholder wording
 * until the client supplies final copy (FR-002); the heading and
 * supporting text below are the live reference's own wording (extracted
 * verbatim — research/design-tokens.md "Signup band"), kept as the
 * placeholder default. The note has no reference to extract from (the
 * reference has no usage note under the form — spec "Deviations from
 * the Reference") and is drafted copy.
 */

export interface SignupCopy {
  heading: { before: string; highlight: string; after: string; placeholder: boolean };
  supporting: { text: string; placeholder: boolean };
  note: { text: string; placeholder: boolean };
  fields: { name: string; email: string; phone: string };
  submit: string;
  submitting: string;
  success: { title: string; body: string; again: string };
  errors: { rateLimited: string; unavailable: string };
}

export const signupCopy: SignupCopy = {
  heading: {
    before: "Join Over ",
    // The reference highlights "300,000 Students" together (not just the
    // number) — confirmed in research/tokens/signup-1440.json's
    // headingSpanTexts, correcting an earlier assumption made before the
    // extraction pass ran.
    highlight: "300,000 Students",
    after: " Enjoying Dar-e-Arqam School Now",
    placeholder: true,
  },
  supporting: {
    text: "Become Part of Dar-e-Arqam Schools to Further Your Career.",
    placeholder: true,
  },
  note: {
    text: "We will only use these details to contact you about admissions and school updates.",
    placeholder: true,
  },
  fields: {
    name: "Name",
    email: "Email",
    phone: "Phone",
  },
  submit: "Signup",
  submitting: "Sending…",
  success: {
    title: "Thank you!",
    body: "We have received your details and will be in touch soon.",
    again: "Sign up someone else",
  },
  errors: {
    rateLimited: "Please try again shortly.",
    unavailable: "Something went wrong — please try again.",
  },
} as const;

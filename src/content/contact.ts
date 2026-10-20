/**
 * Contact page copy (Constitution VI — page copy lives in content
 * files, not hardcoded inside components). Contact values themselves
 * (phone, email, address, mapUrl, officeHours) live in `contactInfo`
 * (src/content/site-shell.ts) — the Settings-shaped source; this file
 * holds only static labels and messages.
 */
export const contactCopy = {
  banner: {
    title: "Contact",
    breadcrumbHome: "Home",
  },
  details: {
    heading: "Get in touch",
    address: "Address",
    phone: "Phone",
    email: "Email",
    timings: "School timings",
  },
  map: {
    heading: "Locate Us on Google Maps",
    openInMaps: "Open in Google Maps",
    iframeTitle: (address: string) => `Map showing ${address}`,
  },
  form: {
    heading: "Send us a message",
    placeholders: {
      name: "Name",
      email: "Email",
      phone: "Phone (optional)",
      subject: "Subject",
      message: "Your Message",
    },
    submit: "Send",
    sending: "Sending…",
    counter: (n: number, max: number) => `${n.toLocaleString("en")} / ${max.toLocaleString("en")}`,
    // Placeholder wording (001 precedent) — the client may supply final copy.
    success: {
      placeholder: true,
      title: "Thank you for your message!",
      body: "We have received your enquiry and will get back to you soon.",
      again: "Send another message",
    },
    errors: {
      rateLimited: "Too many messages — please try again shortly.",
      unavailable: "We couldn't send your message right now. Please try again in a moment.",
    },
  },
} as const;

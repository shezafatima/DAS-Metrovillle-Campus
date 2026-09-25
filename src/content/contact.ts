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
  columns: {
    phone: {
      heading: "BY PHONE",
      // The reference's subtitle here is the office hours text itself,
      // not a static label — rendered from contactInfo.officeHours at
      // render time (contracts/contact-page.md "Column contents").
      subtitle: null,
      icon: { src: "/images/contact/by-phone.png", alt: "Phone Us" },
    },
    email: {
      heading: "BY EMAIL",
      subtitle: "Write email on any of the following addresses",
      icon: { src: "/images/contact/by-email.png", alt: "Email Us" },
    },
    visit: {
      heading: "VISIT US",
      subtitle: "Visit us in person and meet our representative",
      icon: { src: "/images/contact/visit-us.png", alt: "Visit Us" },
    },
    write: {
      heading: "WRITE US",
      subtitle: "Write us an inquiry by filling form below",
      icon: { src: "/images/contact/write-us.png", alt: "Write Us" },
      writeLink: "Click this link to view inquiry form",
    },
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

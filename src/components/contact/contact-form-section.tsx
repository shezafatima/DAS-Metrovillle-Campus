import { ContactForm } from "@/components/contact/contact-form";
import { GlowFrame } from "@/components/glow/glow-frame";
import { contactCopy } from "@/content/contact";

/** The right half of the contact card: the form on a light face inside the travelling gold border. */
export function ContactFormSection() {
  return (
    <section
      id="contact-form"
      aria-labelledby="contact-form-heading"
      className="anchor-section min-w-0 bg-(--color-home-muted-band) p-3 sm:p-8 lg:p-10"
    >
      <GlowFrame faceClassName="bg-surface p-4 sm:p-6">
        <h2 id="contact-form-heading" className="mb-5 font-bold font-heading text-h2 text-primary">
          {contactCopy.form.heading}
        </h2>
        <ContactForm />
      </GlowFrame>
    </section>
  );
}

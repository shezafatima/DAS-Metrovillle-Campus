import { ContactForm } from "@/components/contact/contact-form";
import { contactCopy } from "@/content/contact";

export function ContactFormSection() {
  return (
    <section
      id="contact-form"
      aria-labelledby="contact-form-heading"
      className="bg-contact-form-band py-(--spacing-contact-form-band-y)"
    >
      <div className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x)">
        <h2 id="contact-form-heading" className="sr-only">
          {contactCopy.form.heading}
        </h2>
        <ContactForm />
      </div>
    </section>
  );
}

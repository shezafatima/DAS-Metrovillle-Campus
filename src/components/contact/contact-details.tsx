import { ContactDetailColumn } from "@/components/contact/contact-detail-column";
import { WriteUsLink } from "@/components/contact/write-us-link";
import { contactCopy } from "@/content/contact";
import type { ContactInfo } from "@/content/site-shell";

export interface ContactDetailsProps {
  details: ContactInfo;
}

export function ContactDetails({ details }: ContactDetailsProps) {
  const copy = contactCopy.columns;

  return (
    <section
      aria-label="Contact details"
      className="mx-auto grid max-w-(--container-max-width) grid-cols-1 gap-(--spacing-contact-columns-gap) px-(--container-gutter-x) py-12 lg:grid-cols-4"
    >
      <ContactDetailColumn
        icon={copy.phone.icon}
        heading={copy.phone.heading}
        subtitle={<span data-placeholder>{details.officeHours}</span>}
      >
        <a href={`tel:${details.phone}`} className="text-primary hover:underline">
          {details.phone}
        </a>
      </ContactDetailColumn>

      <ContactDetailColumn icon={copy.email.icon} heading={copy.email.heading} subtitle={copy.email.subtitle}>
        <a href={`mailto:${details.email}`} className="text-primary hover:underline">
          {details.email}
        </a>
      </ContactDetailColumn>

      <ContactDetailColumn icon={copy.visit.icon} heading={copy.visit.heading} subtitle={copy.visit.subtitle}>
        <span data-placeholder>{details.address}</span>
      </ContactDetailColumn>

      <ContactDetailColumn icon={copy.write.icon} heading={copy.write.heading} subtitle={copy.write.subtitle}>
        <WriteUsLink />
      </ContactDetailColumn>
    </section>
  );
}

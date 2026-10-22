import type { ReactNode } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactMap } from "@/components/contact/contact-map";
import { SocialLinks } from "@/components/site-shell/social-links";
import { contactCopy } from "@/content/contact";
import type { ContactInfo } from "@/content/site-shell";

export interface ContactDetailsProps {
  details: ContactInfo;
}

// White on the navy half; hover is the yellow token, and the focus ring is white so it shows on navy.
const linkClass =
  "rounded-sm underline-offset-4 transition-colors duration-(--motion-fast) hover:text-(--color-topbar) hover:underline focus-visible:text-(--color-topbar) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** The left half of the contact card: the school's details, the map, then the social links, on navy. */
export function ContactDetails({ details }: ContactDetailsProps) {
  const copy = contactCopy.details;

  return (
    <section
      aria-labelledby="contact-details-heading"
      className="flex min-w-0 flex-col gap-8 bg-primary p-6 text-white sm:p-8 lg:p-10"
    >
      <h2 id="contact-details-heading" className="font-bold font-heading text-h2 text-white">
        {copy.heading}
      </h2>

      <ul className="flex flex-col gap-5">
        <DetailRow icon={<MapPin />} label={copy.address}>
          <span data-placeholder className="break-words">
            {details.address}
          </span>
        </DetailRow>
        <DetailRow icon={<Phone />} label={copy.phone}>
          <a href={`tel:${details.phone}`} className={linkClass}>
            {details.phone}
          </a>
        </DetailRow>
        <DetailRow icon={<Mail />} label={copy.email}>
          <a href={`mailto:${details.email}`} className={`${linkClass} break-all`}>
            {details.email}
          </a>
        </DetailRow>
        <DetailRow icon={<Clock />} label={copy.timings}>
          <span data-placeholder>{details.officeHours}</span>
        </DetailRow>
      </ul>

      <ContactMap address={details.address} mapUrl={details.mapUrl} linkClass={linkClass} />

      <SocialLinks social={details.social} onDark className="mt-auto" />
    </section>
  );
}

function DetailRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--color-topbar) text-primary [&>svg]:size-5"
      >
        {icon}
      </span>
      <div className="min-w-0 font-body text-body">
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
        {children}
      </div>
    </li>
  );
}

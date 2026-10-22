import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { footerContent, type ContactInfo } from "@/content/site-shell";
import type { PublicPortalLink } from "@/lib/settings/public";
import { SocialLinks } from "./social-links";

// Links: navy on the white footer. Hover and keyboard focus use the yellow (the existing token) as a highlight behind
// the navy text (yellow text on white would be unreadable), and focus adds a navy outline so it is clearly visible.
const link =
  "-mx-1 rounded-sm px-1 text-primary transition-colors duration-(--motion-fast) hover:bg-(--color-topbar) focus-visible:bg-(--color-topbar) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--color-primary)";
const heading = "mb-4 font-heading text-base font-bold text-primary";

/**
 * The public footer (001 FR-011/FR-025, redesigned 2026-10-08): on white, four columns (the school, Quick Links,
 * Portal Links, Contact Us), then a thin divider and a bottom bar. Two columns at tablet width, one on a phone,
 * stacked in that order. The column titles are not headings (so the page's heading order is untouched): each link
 * group is a `nav` named by its title, and the contact details sit in an `address`.
 *
 * Contact details and social links come from Settings (005), read once by the shell and passed in. So do the
 * Portal Links (014b): each opens its external site in a new tab, and with none saved the whole column is hidden and
 * the other columns reflow (three at desktop width instead of four).
 */
export function Footer({ contact, portalLinks = [] }: { contact: ContactInfo; portalLinks?: PublicPortalLink[] }) {
  const year = new Date().getFullYear();
  const { description, logo, quickLinks, directions, credit, headings } = footerContent;

  return (
    <footer id="site-footer" className="border-t border-neutral-100 bg-surface">
      <div
        className={`mx-auto grid max-w-(--container-max-width) gap-10 px-(--container-gutter-x) py-12 md:grid-cols-2 lg:py-16 ${portalLinks.length > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
      >
        <div className="min-w-0">
          <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} className="h-12 w-auto" />
          <p className="mt-4 max-w-sm font-body text-sm leading-relaxed text-text-muted">{description}</p>
          <SocialLinks social={contact.social} className="mt-5" />
        </div>

        <nav aria-labelledby="footer-quick-links" className="min-w-0">
          <p id="footer-quick-links" className={heading}>
            {headings.quickLinks}
          </p>
          <ul data-testid="quick-links" className="columns-2 gap-x-6 font-body text-sm">
            {quickLinks.map((item) => (
              <li key={item.href} className="mb-2.5 break-inside-avoid">
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {portalLinks.length > 0 && (
          <nav aria-labelledby="footer-portal-links" className="min-w-0">
            <p id="footer-portal-links" className={heading}>
              {headings.portalLinks}
            </p>
            <ul className="flex flex-col gap-2.5 font-body text-sm">
              {portalLinks.map((item) => (
                <li key={item.id}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className={`${link} inline-flex items-center gap-1.5`}>
                    <span>
                      {item.label}{" "}
                      <span className="sr-only">{footerContent.externalLinkSuffix}</span>
                    </span>
                    <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div role="group" aria-labelledby="footer-contact" className="min-w-0">
          <p id="footer-contact" className={heading}>
            {headings.contact}
          </p>
          <address className="font-body text-sm not-italic">
            <ul className="flex flex-col gap-3 text-text-muted">
              <li className="flex gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{contact.address}</span>
              </li>
              <li className="flex gap-3">
                <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`tel:${contact.phone}`} className={link}>
                  {contact.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`mailto:${contact.email}`} className={`${link} break-all`}>
                  {contact.email}
                </a>
              </li>
              {contact.officeHours && (
                <li className="flex gap-3">
                  <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{contact.officeHours}</span>
                </li>
              )}
            </ul>
          </address>
          <Link href={directions.href} className={`${link} mt-4 inline-flex items-center gap-1.5 font-body text-sm font-semibold`}>
            {directions.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>

      <div className="border-t border-neutral-100">
        <div className="mx-auto flex max-w-(--container-max-width) flex-col items-center gap-1 px-(--container-gutter-x) py-5 text-center font-body text-sm text-text-muted md:flex-row md:justify-between md:text-left">
          <p>{footerContent.copyright(year)}</p>
          <p>
            {credit.before}{" "}
            <a href={credit.href} target="_blank" rel="noopener noreferrer" className={`${link} underline underline-offset-2`}>
              {credit.name}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import {
  contactInfo as defaultContactInfo,
  portalLinks as defaultPortalLinks,
  type ContactInfo,
  type PortalLink,
} from "@/content/site-shell";
import { SocialLinks } from "./social-links";

interface TopBarProps {
  portalLinks?: PortalLink[];
  contact?: ContactInfo;
}

// Matches the reference top bar: portal quick-links on one side, social
// icons on the other. Contact details (FR-010) live in the footer only —
// see the comment on `contactInfo` in src/content/site-shell.ts.
export function TopBar({
  portalLinks = defaultPortalLinks,
  contact = defaultContactInfo,
}: TopBarProps) {
  return (
    <div className="bg-topbar">
      <div className="mx-auto flex max-w-(--container-max-width) flex-wrap items-center justify-between gap-x-6 gap-y-1 px-(--container-gutter-x) py-2 font-body text-topbar-link text-primary">
        {portalLinks.length > 0 && (
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 max-md:w-full">
            {portalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:opacity-75">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <SocialLinks
          social={contact.social}
          variant="light"
          // Below `md`, the portal links already take a full row (or two)
          // on their own, so this list wraps onto its own line — center it
          // on that line instead of leaving it flush left, per user request.
          className="max-md:w-full max-md:justify-center"
        />
      </div>
    </div>
  );
}

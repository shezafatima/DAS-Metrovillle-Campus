import { contactInfo, type ContactInfo } from "@/content/site-shell";

/**
 * The Contact page's single seam for contact values (data-model.md
 * "Contact details"). Today this just returns the content file;
 * Settings (005) replaces only this function's body with a real read —
 * every caller and the returned shape stay the same.
 */
export async function getContactDetails(): Promise<ContactInfo> {
  return contactInfo;
}

/** Derived, never stored — a keyless Google Maps embed URL for an address. */
export function mapEmbedSrc(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/** Fields whose values are still placeholders pending the client's real Metroville details. */
export const CONTACT_PLACEHOLDER_FIELDS = ["address", "mapUrl", "officeHours"] as const;

import type { ContactInfo } from "@/content/site-shell";
import { getPublicSettings } from "@/lib/settings/public";

/**
 * The single seam for contact values (008 data-model.md "Contact details"):
 * the top bar, the footer and the Contact page all read them here. Since 005
 * they come from Settings (cached, and never an error: an unsaved or
 * unreadable group reads as the 001/008 content-file values). The returned
 * shape did not change.
 */
export async function getContactDetails(): Promise<ContactInfo> {
  return getPublicSettings("contact");
}

/** Derived, never stored — a keyless Google Maps embed URL for an address. */
export function mapEmbedSrc(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/** Fields whose values are still placeholders pending the client's real Metroville details. */
export const CONTACT_PLACEHOLDER_FIELDS = ["address", "mapUrl", "officeHours"] as const;

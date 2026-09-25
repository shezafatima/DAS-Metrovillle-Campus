import type { Metadata } from "next";
import { ContactBanner } from "@/components/contact/contact-banner";
import { ContactDetails } from "@/components/contact/contact-details";
import { ContactMap } from "@/components/contact/contact-map";
import { ContactFormSection } from "@/components/contact/contact-form-section";
import { getContactDetails } from "@/lib/contact-details";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const details = await getContactDetails();

  return (
    <>
      <ContactBanner />
      <ContactDetails details={details} />
      <ContactMap address={details.address} mapUrl={details.mapUrl} />
      <ContactFormSection />
    </>
  );
}

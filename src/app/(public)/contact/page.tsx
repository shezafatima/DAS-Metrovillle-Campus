import type { Metadata } from "next";
import { ContactBanner } from "@/components/contact/contact-banner";
import { ContactDetails } from "@/components/contact/contact-details";
import { ContactFormSection } from "@/components/contact/contact-form-section";
import { getContactDetails } from "@/lib/contact-details";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const details = await getContactDetails();

  return (
    <>
      <ContactBanner />
      <div className="mx-auto max-w-(--container-max-width) px-3 py-12 sm:px-(--container-gutter-x)">
        <div className="grid grid-cols-1 overflow-hidden rounded-xl shadow-lg lg:grid-cols-2">
          <ContactDetails details={details} />
          <ContactFormSection />
        </div>
      </div>
    </>
  );
}

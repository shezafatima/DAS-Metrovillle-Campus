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
      {/* w-full: this wrapper is a direct child of the flex-column <main>, where auto side margins would shrink it to its content. */}
      <div className="mx-auto w-full max-w-(--container-max-width) px-3 py-12 sm:px-(--container-gutter-x)">
        <div className="grid grid-cols-1 overflow-hidden rounded-xl shadow-lg lg:min-h-(--spacing-contact-card-min-h) lg:grid-cols-2 xl:min-h-(--spacing-contact-card-min-h-xl)">
          <ContactDetails details={details} />
          <ContactFormSection />
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { after } from "next/server";
import { RegistrationClosed } from "@/components/registration/registration-closed";
import { RegistrationForm } from "@/components/registration/registration-form";
import { PageBanner } from "@/components/site-shell/page-banner";
import { registrationCopy } from "@/content/registration";
import { getEnv } from "@/lib/env";
import { getRegistrationAvailability } from "@/lib/registration/availability";
import { maybeSweepRegistrations } from "@/lib/registration/retention";

export const metadata: Metadata = {
  title: registrationCopy.page.metaTitle,
  alternates: { canonical: "/admission/register" },
};

/**
 * Student registration (013). Rendered per request: whether registration is
 * open changes at midnight Pakistan time (getRegistrationAvailability calls
 * connection()). When closed, no form is rendered at all.
 */
export default async function RegistrationPage() {
  const availability = await getRegistrationAvailability();
  after(() => maybeSweepRegistrations());
  const copy = registrationCopy.page;

  return (
    <>
      <PageBanner
        title={copy.bannerTitle}
        trail={[copy.breadcrumbAdmission, copy.bannerTitle]}
        breadcrumbHome={copy.breadcrumbHome}
        backgroundImage="/images/contact/banner.webp"
      />
      <section id="registration" aria-labelledby="registration-heading" className="bg-contact-form-band py-(--spacing-contact-form-band-y)">
        <div className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x)">
          <h2 id="registration-heading" className="sr-only">
            {copy.bannerTitle}
          </h2>
          {availability.open ? (
            <>
              <p className="mb-(--spacing-registration-section-gap) font-body text-body text-foreground">{copy.intro}</p>
              <RegistrationForm
                classes={availability.classes}
                today={availability.today}
                retentionMonths={getEnv().REGISTRATION_RETENTION_MONTHS}
              />
            </>
          ) : (
            <RegistrationClosed message={availability.closedMessage} />
          )}
        </div>
      </section>
    </>
  );
}

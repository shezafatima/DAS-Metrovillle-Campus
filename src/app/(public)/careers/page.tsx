import type { Metadata } from "next";
import { CareersFormSection } from "@/components/careers/careers-form-section";
import { CareersIntro } from "@/components/careers/careers-intro";
import { PageBanner } from "@/components/site-shell/page-banner";
import { careersCopy } from "@/content/careers";

export const metadata: Metadata = {
  title: "Careers",
  description: careersCopy.intro.paragraphs[0],
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <>
      <PageBanner
        title={careersCopy.banner.title}
        trail={["Careers"]}
        breadcrumbHome={careersCopy.banner.breadcrumbHome}
        backgroundImage="/images/contact/banner.webp"
      />
      <CareersIntro />
      <CareersFormSection />
    </>
  );
}

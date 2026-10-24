import type { Metadata } from "next";
import { CareersFormSection } from "@/components/careers/careers-form-section";
import { PageTitle } from "@/components/site-shell/page-title";
import { careersCopy } from "@/content/careers";

export const metadata: Metadata = {
  title: "Careers",
  description: careersCopy.intro.paragraphs[0],
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-(--container-max-width) px-(--container-gutter-x)">
        <PageTitle>{careersCopy.banner.title}</PageTitle>
      </div>
      <CareersFormSection />
    </>
  );
}

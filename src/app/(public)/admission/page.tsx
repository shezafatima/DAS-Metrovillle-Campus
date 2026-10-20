import type { Metadata } from "next";
import { connection } from "next/server";
import { AdmissionProcedureSection } from "@/components/admission/admission-procedure";
import { AdmissionWindowNotice } from "@/components/admission/admission-window-notice";
import { ApplyButton } from "@/components/admission/apply-button";
import { UniformSection } from "@/components/admission/uniform-section";
import { PageBanner } from "@/components/site-shell/page-banner";
import { admissionPage, admissionProcedure, uniformContent, uniformTitle } from "@/content/admission";
import { careersCopy } from "@/content/careers";
import { homeContent } from "@/content/home";
import { pageSections } from "@/content/site-shell";
import { getAdmissionWindow, isAdmissionApplyOpen } from "@/lib/admission/server";

export const metadata: Metadata = {
  title: admissionPage.title,
  alternates: { canonical: "/admission" },
};

/**
 * Admission (020): Admission Procedure then Uniform. Rendered per request
 * (connection(), ADR-0011) because whether admissions are open changes at
 * midnight Pakistan time with no save or redeploy. The Apply button's
 * visibility comes only from isAdmissionApplyOpen().
 */
export default async function AdmissionPage() {
  await connection();
  const [admissionWindow, applyOpen] = await Promise.all([getAdmissionWindow(), isAdmissionApplyOpen()]);
  const groups = uniformContent.uniform;
  return (
    <>
      <PageBanner title={admissionPage.title} trail={admissionPage.trail} breadcrumbHome={careersCopy.banner.breadcrumbHome} />
      {pageSections.admission.map((section) => {
        switch (section.id) {
          case "admission-procedure":
            return (
              <AdmissionProcedureSection
                key={section.id}
                heading={section.label}
                procedure={admissionProcedure}
                notice={
                  <AdmissionWindowNotice
                    state={admissionWindow.state}
                    announcement={admissionWindow.announcement}
                    closedMessage={admissionWindow.closedMessage}
                    closesOnLine={admissionPage.closesOn}
                  />
                }
                action={applyOpen ? <ApplyButton label={admissionPage.apply.label} href={admissionPage.apply.href} /> : undefined}
              />
            );
          case "uniform":
            return (
              <UniformSection
                key={section.id}
                heading={section.label}
                groups={groups}
                label={admissionPage.uniformLabel}
                flipLabels={groups.map((group) => admissionPage.flipUniform(uniformTitle(group)))}
                positionLabels={groups.map((_, i) => homeContent.carousel.position(i + 1, groups.length))}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}

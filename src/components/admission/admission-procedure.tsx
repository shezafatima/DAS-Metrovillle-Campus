import type { ReactNode } from "react";
import { AboutSection } from "@/components/about/about-section";
import type { AdmissionProcedure } from "@/lib/admission/schema";
import { ProcedureBlocks } from "./procedure-blocks";

/**
 * Admission Procedure (020 US1): the window notice first (US3), then the four
 * steps copied from the reference, then the Apply button when allowed (US6).
 * Each step's heading and intro line are centred as on the reference; the
 * reference's icons, wave bands and next-step buttons are left out (spec
 * deviations V2, V3).
 */
export function AdmissionProcedureSection({
  heading,
  procedure,
  notice,
  action,
}: {
  heading: string;
  procedure: AdmissionProcedure;
  notice?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <AboutSection id="admission-procedure" background="surface" heading={heading}>
      {notice}
      {procedure.sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-4" data-testid="procedure-step">
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="font-bold font-heading text-h3 text-primary">{section.heading}</h3>
            <p className="font-body text-body text-text">{section.intro}</p>
          </div>
          <ProcedureBlocks sectionId={section.id} blocks={section.blocks} />
        </div>
      ))}
      {action}
    </AboutSection>
  );
}

import type { AdmissionPage } from "@/lib/admission/schema";

/** Admission page copy (020). The h1 is "Admission"; the sections' h2s come from pageSections. */
export const admissionPage: AdmissionPage = {
  title: "Admission",
  trail: ["Admission"],
  closesOn: (date) => `Applications close on ${date}`,
  apply: { label: "Apply Now", href: "/admission/register" },
  uniformLabel: "Uniforms",
  // Same pattern as the home cards' flip button ("…: show details").
  flipUniform: (title) => `${title}: show the uniform list`,
};

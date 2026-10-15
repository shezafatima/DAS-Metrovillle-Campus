import { admissionPageSchema, procedureSchema, uniformSchema } from "@/lib/admission/schema";
import { admissionPage as rawPage } from "./page";
import { admissionProcedure as rawProcedure } from "./procedure";
import { uniformContent as rawUniform } from "./uniform";

// Parsed at module load, so a bad edit fails loudly at build and in tests.
admissionPageSchema.parse(rawPage);
export const admissionPage = rawPage;
export const admissionProcedure = procedureSchema.parse(rawProcedure);
export const uniformContent = uniformSchema.parse(rawUniform);

export { uniformTitle } from "./uniform";

/** Text copied from the reference is pending client confirmation (020 FR-031). */
export const admissionReviews = {
  status: "pending-client-approval" as const,
  questions: [
    "Do the admission procedure and the uniform lists apply to the Metroville campus? (The reference uniform page dates from 2019.)",
    "Age criteria per class: the reference's Eligibility table is empty, and parents will look for it.",
    "Fees: is tuition payable every month (Rules of Payment) or every two months (fee table)? The reference says both.",
    "Senior girls: is the qamiz green check (the text) or white with green-check trim (the photo)?",
    "Hifz boys: the supplied photo shows a white cap and white socks and no waist coat or blazer, but the list says Black Waist Coat, Green blazer and Black Socks. Which is right?",
    "The Hifz girls' uniform card is not shown (requester, 2026-10-14); confirm whether it should return.",
    "Class Levels content, when ready.",
  ],
};

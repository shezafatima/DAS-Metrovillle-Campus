import type { AcademicsPage } from "@/lib/academics/schema";

// PENDING CLIENT APPROVAL: the page title is not from a document (spec Clarification Q4).
export const academicsPage: AcademicsPage = { title: "Academics", playLabel: "Play video" };

export const review = {
  status: "pending-client-approval" as const,
  notes: ["Page title is not from a document (spec Clarification Q4)."],
};

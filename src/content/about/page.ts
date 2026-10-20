import type { AboutPage } from "@/lib/about/schema";

// PENDING CLIENT APPROVAL: the page title is not from a document.
export const aboutPage: AboutPage = { title: "About Us" };

export const review = {
  status: "pending-client-approval" as const,
  notes: ["The title 'About Us' is not from a document."],
};

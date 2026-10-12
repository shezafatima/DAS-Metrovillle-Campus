import type { AcademicOverview } from "@/lib/academics/schema";

// Source: docs/content-source/academics/academic-overview.txt (English only; the Urdu version is not stored).
export const academicOverview: AcademicOverview = {
  heading: "Academic Excellence",
  subheading: "Building Strong Foundations for Lifelong Learning",
  body: [
    "We believe that quality education begins with strong foundations. Our teaching approach encourages students to think critically, explore new ideas, and apply their knowledge with confidence.",
    "By combining modern teaching methodologies, activity-based learning, continuous assessment, and individual attention, we create an engaging learning environment where every student has the opportunity to succeed.",
    "Our classrooms inspire curiosity, creativity, collaboration, and confidence, preparing students not only for examinations but also for lifelong learning.",
  ].join("\n\n"),
  image: null,
  imageAlt: "",
};

// PENDING CLIENT APPROVAL: see the notes below.
export const review = {
  status: "pending-client-approval" as const,
  notes: [
    "T2: the line 'Curiosity with Purpose' at the end of the document fits neither language version and is not shown.",
    "T3: the menu label is 'Academic Overview'; the section heading is the document's 'Academic Excellence'.",
    "The photo has not been supplied yet; the emblem panel shows.",
  ],
};

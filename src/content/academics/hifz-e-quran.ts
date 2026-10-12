import type { HifzEQuran } from "@/lib/academics/schema";

// Source: docs/content-source/academics/hifz-e-quran.txt (English only; the Urdu version is not stored).
export const hifzEQuran: HifzEQuran = {
  // Stored and shown exactly as written, with no case change in content or CSS (T4).
  heading: "HIFZ-UL-QURAN PROGRAM",
  subheading: "A Meaningful Step Towards a Beautiful World & a Better Hereafter",
  intro:
    "At Dar-e-Arqam Schools, developing a strong connection with the Qur’an and nurturing its understanding and memorization are given fundamental importance. After Grade 3, students have the option to enroll in the Hifz-ul-Quran Program.",
  // Each sub-section's sentences are shown as points with icons, at the owner's request (2026-10-12).
  subsections: [
    {
      id: "admission-based-on-aptitude",
      heading: "Admission Based on Aptitude",
      points: [
        {
          id: "observation-period",
          text: "Before admission, the student undergoes a 15-day observation period to assess their aptitude, interest, memory and suitability for Hifz.",
          icon: "search",
        },
        { id: "admission-decision", text: "Admission is decided based on this assessment.", icon: "clipboard-check" },
      ],
    },
    {
      id: "hifz-alongside-academic-education",
      heading: "Hifz Alongside Academic Education",
      points: [
        {
          id: "core-education-continues",
          text: "Students in the Hifz Program continue their core academic education alongside Qur’an memorization.",
          icon: "graduation-cap",
        },
        {
          id: "education-continuity",
          // PENDING CLIENT APPROVAL: T1, translated from the Urdu at the owner's request (2026-10-12).
          text: "This continuity in education ensures that, after completing the memorization of the Qur’an, the student can successfully continue their academic education.",
          icon: "trending-up",
        },
      ],
    },
  ],
  video: { provider: "instagram", url: "https://www.instagram.com/reel/DZrhQmey_1i/", poster: null, title: "Hifz-ul-Quran Program video" },
};

// PENDING CLIENT APPROVAL: see the notes below.
export const review = {
  status: "pending-client-approval" as const,
  notes: [
    "T1: the English omits a sentence that the Urdu has; it was translated and added at the owner's request.",
    "The sub-sections are shown as 4 points with icons at the owner's request (2026-10-12); the wording is unchanged, split at sentence ends.",
    "T4: the heading is shown exactly as the document has it, in capitals.",
    "T5: the spelling switches between 'Qur’an' and 'Quran'; kept as written.",
    "The video is an Instagram reel (owner, 2026-10-12); the poster has not been supplied yet.",
    "The video title is not from a document.",
  ],
};

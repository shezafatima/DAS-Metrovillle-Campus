import type { TeachersTraining } from "@/lib/academics/schema";

// Source: docs/content-source/academics/teachers-training.txt, copied from the reference page (see teachersTrainingSource).
export const teachersTraining: TeachersTraining = {
  heading: "Teachers' Training",
  // PENDING CLIENT APPROVAL: shortened at the owner's request (2026-10-12); the source intro is in teachers-training.txt.
  intro: "Resources we offer to support our teaching faculty:",
  // PENDING CLIENT APPROVAL: 8 of the 19 source points, each with an icon, chosen at the owner's request (2026-10-12).
  items: [
    { id: "school-leadership", text: "School leadership", icon: "compass" },
    { id: "managing-classrooms", text: "Managing classrooms (teaching faculty)", icon: "users" },
    { id: "improving-student-grades", text: "Improving student grades", icon: "trending-up" },
    { id: "assessment-manuals", text: "Teacher / Student assessment manuals", icon: "clipboard-check" },
    { id: "literacy-development", text: "Literacy development", icon: "book-open" },
    { id: "learning-through-technology", text: "Learning through technology", icon: "laptop" },
    { id: "professional-development-guides", text: "Guides for professional development of teachers", icon: "graduation-cap" },
    { id: "curriculum-planning-guides", text: "Curriculum planning guides", icon: "notebook-pen" },
  ],
  photos: [
    {
      id: "training-photo-1",
      image: { url: "/images/academics/teachers-training/training1.jpeg", publicId: "", width: 1600, height: 900 },
      alt: "Teachers seated in rows in a decorated hall during a training session, with a trainer at the whiteboard",
    },
    {
      id: "training-photo-2",
      image: { url: "/images/academics/teachers-training/training2.jpeg", publicId: "", width: 1600, height: 900 },
      alt: "Teachers listening attentively during a training session in a hall with hanging decorations",
    },
    {
      id: "training-photo-3",
      image: { url: "/images/academics/teachers-training/training3.jpeg", publicId: "", width: 900, height: 1600 },
      alt: "A trainer addressing seated teachers in the school hall",
    },
  ],
  video: { provider: "instagram", url: "https://www.instagram.com/reel/DX3yA97gvz5/", poster: null, title: "Teachers' Training video" },
};

/** FR-011: where the text was copied from, and when. */
export const teachersTrainingSource = { url: "https://das.edu.pk/academics/teachers-training/", copiedOn: "2026-10-12" };

// PENDING CLIENT APPROVAL: see the notes below.
export const review = {
  status: "pending-client-approval" as const,
  notes: [
    "Shown as 8 of the 19 source points, each with an icon, at the owner's request; the other 11 are still in teachers-training.txt.",
    "Intro shortened at the owner's request (2026-10-12); the source paragraph is unchanged in teachers-training.txt.",
    "T6: 'new innovative ideas' is redundant and 'fresh teachers' is unusual wording; kept as written.",
    "T7: the text describes the Dar-e-Arqam Foundation network-wide, not the Metroville Campus specifically.",
    "The video is an Instagram reel (owner, 2026-10-12); the owner supplied three photos (2026-10-12); the alt text is a draft description pending client approval.",
    "The video title is not from a document.",
  ],
};

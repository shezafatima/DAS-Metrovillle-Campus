import type { Messages } from "@/lib/about/schema";

// PENDING CLIENT APPROVAL: text is verbatim from docs/content-source/about/messages.txt.
export const messagesContent: Messages = {
  heading: "Messages",
  messages: [
    {
      id: "director-academic-training",
      name: "Khairullah Aziz",
      designation: "Director – Academic & Training",
      body: "\"Every child has unique abilities and learns differently. Through innovative teaching practices, continuous teacher development, and effective academic monitoring, we strive to help every student discover and achieve his or her full potential.\"",
      photo: null
    },
    {
      id: "director-administration-finance",
      name: "Ijaz Afzal",
      designation: "Director Administration & Finance",
      body: "\"Education is more than academic achievement; it is the foundation upon which faith, character, and responsible leadership are built. At Metroville Campus, we strive to support an environment where every aspect of our institution is managed with responsibility, integrity, and excellence—enabling our students and teachers to learn, grow, and contribute positively to society.\"",
      photo: null
    },
    {
      id: "principal",
      name: "Faiza Zeeshan",
      designation: "Principal",
      body: "\"A positive learning environment inspires confidence, curiosity, and a lifelong love for learning. We are dedicated to ensuring that every child feels valued, supported, and encouraged to achieve excellence in academics and character.\"",
      photo: null
    }
  ]
};

export const review = {
  status: "pending-client-approval" as const,
  notes: [
    "T1: the designation pattern ('Director – Academic & Training' vs 'Director Administration & Finance') is pending the client.",
    "T2 applied (formatting only): Ijaz Afzal's name and designation were one run with a line break; they are now two fields.",
    "The heading 'Messages' is the brief's label, not from a document.",
    "Photos are missing; placeholders are shown.",
    "The Welcome Note, '(Page No 1)' and 'Where Intelligence Meets Character' are left out (Findings 1-3)."
  ],
};

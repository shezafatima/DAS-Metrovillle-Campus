import type { ManagementTeam, TeamMember } from "@/lib/about/schema";
import { messagesContent } from "./messages";

// PENDING CLIENT APPROVAL: the team is the people who wrote the Messages (owner, 2026-10-22). Names, designations
// and photos come from messages.ts so the two cannot disagree. No descriptions are supplied; a card shows the
// name and designation only. With no members the section is hidden in production and shows `teamPlaceholders` in development.
export const managementTeam: ManagementTeam = {
  heading: "Our Management Team",
  members: messagesContent.messages.map((message) => ({
    id: message.id,
    name: message.name,
    designation: message.designation,
    photo: message.photo,
  })),
};

/** Development-only cards. Never part of the stored value and never written to the database. */
export const teamPlaceholders: TeamMember[] = [1, 2, 3].map((n) => ({
  id: `placeholder-${n}`,
  name: "Name",
  designation: "Designation",
  description: "Short description",
  photo: null,
}));

export const review = {
  status: "pending-client-approval" as const,
  notes: [
    "Heading is the brief's label, not from a document.",
    "Members are the three people who wrote the Messages; descriptions and photos are not supplied.",
    "Placeholders are development-only and show only when there are no members.",
  ],
};

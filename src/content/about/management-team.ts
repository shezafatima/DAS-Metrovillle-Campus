import type { ManagementTeam, TeamMember } from "@/lib/about/schema";

// PENDING CLIENT APPROVAL: the members are not supplied yet. Until they are,
// the section is hidden in production and shows `teamPlaceholders` in development.
export const managementTeam: ManagementTeam = {
  heading: "Our Management Team",
  members: [],
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
  notes: ["Heading is the brief's label, not from a document.", "Members not supplied yet; placeholders are development-only."],
};

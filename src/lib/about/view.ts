import { pageSections } from "@/content/site-shell";
import { teamPlaceholders } from "@/content/about/management-team";
import type { TeamMember } from "./schema";

export type AboutSectionId = (typeof pageSections.about)[number]["id"];
export type AboutBackground = "surface" | "muted" | "navy";
export interface VisibleSection {
  id: AboutSectionId;
  label: string;
  background: AboutBackground;
}
export type TeamCard = TeamMember & { placeholder: boolean };
export interface AboutView {
  sections: VisibleSection[];
  teamCards: TeamCard[];
}

/** Placeholders show only in `next dev`, never in a build, unless the test seam forces production. */
export function showTeamPlaceholders({
  nodeEnv,
  forceProduction,
}: {
  nodeEnv: string | undefined;
  forceProduction: boolean;
}): boolean {
  return nodeEnv === "development" && !forceProduction;
}

/**
 * Which About sections, team cards and backgrounds are shown. The page, the
 * header menu and the search index all use this, so they cannot disagree.
 */
export function aboutView({
  members,
  messageCount,
  showPlaceholders,
}: {
  members: TeamMember[];
  messageCount: number;
  showPlaceholders: boolean;
}): AboutView {
  const teamCards: TeamCard[] =
    members.length > 0
      ? members.map((m) => ({ ...m, placeholder: false }))
      : showPlaceholders
        ? teamPlaceholders.map((m) => ({ ...m, placeholder: true }))
        : [];

  const visible = pageSections.about.filter((section) => {
    if (section.id === "management-team") return teamCards.length > 0;
    if (section.id === "messages") return messageCount > 0;
    return true;
  });

  let alternating = 0;
  const sections = visible.map((section): VisibleSection => {
    if (section.id === "vision-mission") return { ...section, background: "navy" };
    const background: AboutBackground = alternating % 2 === 0 ? "surface" : "muted";
    alternating += 1;
    return { ...section, background };
  });
  return { sections, teamCards };
}

/** Desktop column count of the Core Values grid (FR-013). */
export function valuesColumns(count: number): 3 | 4 {
  return count % 3 === 0 ? 3 : 4;
}

/** The About dropdown / mobile group / search entries, from the same view as the page. */
export function aboutNavChildren(view: AboutView): { label: string; href: string }[] {
  return view.sections.map((s) => ({ label: s.label, href: `/about#${s.id}` }));
}

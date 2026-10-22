import { pageSections, type PageSection } from "@/content/site-shell";

/**
 * Sections whose content an admin manages (014b): Syllabi and Examination on
 * Academics, Class Levels on Admission. A section with no content is not
 * rendered, and its dropdown and search entries are absent, so the page, the
 * header menu and the search index all go through `visibleSections` and
 * cannot disagree (the same idea as About's view, 017).
 *
 * Pure: `resolveDynamicSections()` (dynamic-server.ts) supplies the presence
 * flags from Settings.
 */
export const DYNAMIC_SECTION_IDS = ["syllabi", "examination", "class-levels"] as const;
export type DynamicSectionId = (typeof DYNAMIC_SECTION_IDS)[number];

export type DynamicPresence = Partial<Record<DynamicSectionId, boolean>>;

const dynamicIds: readonly string[] = DYNAMIC_SECTION_IDS;

/** `sections` without the dynamic ones that have no content. Every other section is always kept, in order. */
export function filterDynamicSections<T extends { id: string }>(sections: readonly T[], presence: DynamicPresence): T[] {
  return sections.filter((section) => !dynamicIds.includes(section.id) || presence[section.id as DynamicSectionId] === true);
}

/** The sections of a page that should be rendered (and listed in the menu and search) for this presence. */
export function visibleSections(page: "academics" | "admission", presence: DynamicPresence): PageSection[] {
  return filterDynamicSections(pageSections[page] as PageSection[], presence);
}

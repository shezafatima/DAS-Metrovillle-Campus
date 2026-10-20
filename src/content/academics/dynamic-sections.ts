/**
 * Words for the admin-managed Academics sections (014b). The sections' h2s come
 * from `pageSections` (src/content/site-shell.ts), like every other section.
 */
export const syllabiCopy = {
  /** Names the row of level tabs for screen readers. */
  tabsLabel: "Class",
  /** The level picker that replaces the tab row on phones. */
  pickerLabel: "Choose a class",
} as const;

export const examinationCopy = {
  /** Names the grid of blocks for screen readers. */
  listLabel: "Examination policy by class",
} as const;

export type SyllabiCopy = typeof syllabiCopy;
export type ExaminationCopy = typeof examinationCopy;

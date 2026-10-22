/**
 * Pure helpers for the Syllabi editor (014b): the editor's state is the group
 * value itself (levels > subjects > groups, see src/lib/settings/groups/syllabi.ts),
 * so these only count and tidy what is already there.
 */

export interface SyllabusGroup {
  id: string;
  heading: string;
  intro: string;
  topics: string[];
}
export interface SyllabusSubject {
  id: string;
  name: string;
  groups: SyllabusGroup[];
}
export interface SyllabusLevel {
  id: string;
  name: string;
  subjects: SyllabusSubject[];
}

/** One topic per line: each line trimmed, blank lines ignored (spec FR-013). */
export function parseTopics(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export const countGroupTopics = (group: Pick<SyllabusGroup, "topics">): number => (Array.isArray(group.topics) ? group.topics.length : 0);

export const countSubjectTopics = (subject: Pick<SyllabusSubject, "groups">): number =>
  (Array.isArray(subject.groups) ? subject.groups : []).reduce((sum, group) => sum + countGroupTopics(group), 0);

export const countLevelTopics = (level: Pick<SyllabusLevel, "subjects">): number =>
  (Array.isArray(level.subjects) ? level.subjects : []).reduce((sum, subject) => sum + countSubjectTopics(subject), 0);

export const countSyllabusTopics = (levels: readonly Pick<SyllabusLevel, "subjects">[]): number => levels.reduce((sum, level) => sum + countLevelTopics(level), 0);

const key = (name: string) => name.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * The names (as typed, first spelling) that more than one item carries, ignoring case and repeated
 * spaces. Blank names are never duplicates. Used for the editor's warning, which never blocks a save.
 */
export function duplicateNames(names: readonly string[]): Set<string> {
  const seen = new Map<string, number>();
  for (const name of names) {
    const k = key(name);
    if (k !== "") seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return new Set([...seen.entries()].filter(([, count]) => count > 1).map(([k]) => k));
}

/** True when `name` is one of the duplicate names found by `duplicateNames`. */
export const isDuplicateName = (duplicates: ReadonlySet<string>, name: string): boolean => duplicates.has(key(name));

/** A blank item of each kind, with a fresh id. */
export const newLevel = (): SyllabusLevel => ({ id: crypto.randomUUID(), name: "", subjects: [] });
export const newSubject = (): SyllabusSubject => ({ id: crypto.randomUUID(), name: "", groups: [] });
export const newGroup = (): SyllabusGroup => ({ id: crypto.randomUUID(), heading: "", intro: "", topics: [] });

/** The level, subject and group lists of a group value, as typed lists (anything else is read as empty). */
export function levelsOf(value: Record<string, unknown>): SyllabusLevel[] {
  const list = (entry: unknown): Record<string, unknown>[] => (Array.isArray(entry) ? entry.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object") : []);
  return list(value.levels).map((level) => ({
    id: String(level.id),
    name: String(level.name ?? ""),
    subjects: list(level.subjects).map((subject) => ({
      id: String(subject.id),
      name: String(subject.name ?? ""),
      groups: list(subject.groups).map((group) => ({
        id: String(group.id),
        heading: String(group.heading ?? ""),
        intro: String(group.intro ?? ""),
        topics: Array.isArray(group.topics) ? group.topics.map((topic) => String(topic)) : [],
      })),
    })),
  }));
}

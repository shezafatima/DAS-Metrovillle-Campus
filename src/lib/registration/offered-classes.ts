import type { PublicAdmission, PublicClassLevels } from "@/lib/settings/public";

const key = (name: string) => name.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * The classes the registration form offers (014b, spec FR-033, ADR-0014):
 *
 *  1. every Class Level that is ticked in "Classes open for admission", in
 *     Class Levels order and under its CURRENT name (a rename flows through;
 *     past registrations keep the text they were submitted with);
 *  2. then the typed names that are not linked to a level yet, in saved order,
 *     so the class migration and old data never change what a parent can
 *     choose until an admin resolves them.
 *
 * A ticked id with no live level is ignored (the level was deleted: the Admission
 * tab warns about it). Names are de-duplicated ignoring case and repeated spaces,
 * the first one winning. An empty result means the form shows the Closed message.
 *
 * Pure, so the form, the submit route and the open/closed rule all share it.
 */
export function offeredClasses(admission: Pick<PublicAdmission, "classes">, classLevels: Pick<PublicClassLevels, "levels">): string[] {
  const ticked = new Set(admission.classes.map((item) => item.levelId).filter((id) => id !== ""));
  const offered: string[] = [];
  const seen = new Set<string>();
  const add = (name: string) => {
    const trimmed = name.trim();
    if (trimmed === "" || seen.has(key(trimmed))) return;
    seen.add(key(trimmed));
    offered.push(trimmed);
  };

  for (const level of classLevels.levels) if (ticked.has(level.id)) add(level.name);
  for (const item of admission.classes) if (item.levelId === "") add(item.name);
  return offered;
}

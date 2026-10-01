import { contactDefinition } from "./groups/contact";
import { heroDefinition } from "./groups/hero";
import { statsDefinition } from "./groups/stats";
import { videoDefinition } from "./groups/video";
import { GROUP_KEYS, type GroupDefinition, type GroupKey } from "./types";

/**
 * Every settings group, by key. The Server Action, the admin pages and the
 * public reader look groups up only through here, so a key that is not in
 * this table is refused everywhere (research R1). Adding a group means adding
 * its key to GROUP_KEYS and one line here.
 */
export const GROUPS: Record<GroupKey, GroupDefinition> = {
  contact: contactDefinition,
  hero: heroDefinition,
  stats: statsDefinition,
  video: videoDefinition,
};

export { GROUP_KEYS };

export function isGroupKey(value: unknown): value is GroupKey {
  return typeof value === "string" && (GROUP_KEYS as readonly string[]).includes(value);
}

/** The definition for a key, or null for anything that is not a known group. */
export function getDefinition(key: unknown): GroupDefinition | null {
  return isGroupKey(key) ? GROUPS[key] : null;
}

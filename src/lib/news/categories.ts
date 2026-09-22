/**
 * The fixed category list (spec Clarifications, FR-036). Not a
 * collection — a constant both the admin and public UIs read labels
 * from, and the source of the reserved public addresses `/news/<key>`
 * (which match the 001 site menu's existing category links).
 */
export const NEWS_CATEGORIES = [
  { key: "head-office", label: "Head Office" },
  { key: "events", label: "Events" },
  { key: "activities", label: "Activities" },
  { key: "achievements", label: "Achievements" },
  { key: "announcements", label: "Announcements" },
] as const;

export type NewsCategoryKey = (typeof NEWS_CATEGORIES)[number]["key"];

/** Tuple form for Zod's `z.enum(...)`, which needs a plain string array. */
export const NEWS_CATEGORY_KEYS = NEWS_CATEGORIES.map((c) => c.key) as [
  NewsCategoryKey,
  ...NewsCategoryKey[],
];

export function isCategoryKey(value: string): value is NewsCategoryKey {
  return (NEWS_CATEGORY_KEYS as readonly string[]).includes(value);
}

export function categoryLabel(key: NewsCategoryKey): string {
  const match = NEWS_CATEGORIES.find((c) => c.key === key);
  // Every NewsCategoryKey is guaranteed to be in NEWS_CATEGORIES by
  // construction; this branch exists only to satisfy the type checker.
  if (!match) throw new Error(`Unknown news category key: ${key}`);
  return match.label;
}

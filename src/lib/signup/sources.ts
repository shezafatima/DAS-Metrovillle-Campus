/**
 * Fixed list of public pages that can host the signup section
 * (data-model.md "Signup source"). Recorded on each signup record as
 * the set of pages the person signed up from (FR-016).
 *
 * Naming: `source` is the code/API name; the admin UI and CSV show it
 * as "Pages" (the spec's "pages signed up from").
 */
export const SIGNUP_SOURCES = [
  { key: "home", label: "Home" },
  { key: "resources", label: "Resources" },
] as const;

export type SignupSource = (typeof SIGNUP_SOURCES)[number]["key"];

export const SIGNUP_SOURCE_KEYS = SIGNUP_SOURCES.map((s) => s.key) as [SignupSource, ...SignupSource[]];

export function isSignupSource(value: unknown): value is SignupSource {
  return typeof value === "string" && (SIGNUP_SOURCE_KEYS as readonly string[]).includes(value);
}

export function sourceLabel(key: SignupSource): string {
  return SIGNUP_SOURCES.find((s) => s.key === key)?.label ?? key;
}

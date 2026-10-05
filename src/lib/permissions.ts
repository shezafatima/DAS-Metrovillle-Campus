/**
 * The one registry of who may use what (011, Constitution III, X). Pure
 * and free of server imports so client components can share it with the
 * DAL. Adding a grantable admin section means appending one key here and
 * naming it in that section's page/route checks — nothing else changes
 * (011 FR-005).
 *
 * Registrations and users are deliberately NOT keys: they belong to the
 * main-admin role and can never be granted (FR-004).
 */
export const PERMISSION_KEYS = ["news", "messages", "careers", "settings", "pages"] as const;

export type Permission = (typeof PERMISSION_KEYS)[number];
export type Role = "main_admin" | "content_manager";

/**
 * What an admin page, route or action requires: a grantable section, the
 * main-admin role itself, or `"any"` (any active user whose password is
 * set — the overview, their own Account page, the session probe).
 */
export type Access = Permission | "main_admin" | "any";

export const ROLES: readonly Role[] = ["main_admin", "content_manager"];

export const PERMISSION_LABELS: Record<Permission, string> = {
  news: "News",
  messages: "Messages",
  careers: "Careers (Applications)",
  settings: "Settings",
  pages: "Page content",
};

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSION_KEYS as readonly string[]).includes(value);
}

export function isRole(value: unknown): value is Role {
  return value === "main_admin" || value === "content_manager";
}

/** Drops unknown keys and duplicates, and orders by PERMISSION_KEYS. */
export function normalizePermissions(values: unknown): Permission[] {
  if (!Array.isArray(values)) return [];
  const wanted = new Set(values.filter(isPermission));
  return PERMISSION_KEYS.filter((key) => wanted.has(key));
}

export function canAccess(user: { role: Role; permissions: readonly string[] }, access: Access): boolean {
  if (user.role === "main_admin") return true;
  if (access === "any") return true;
  if (access === "main_admin") return false;
  return user.permissions.includes(access);
}

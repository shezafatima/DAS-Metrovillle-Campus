/**
 * Guards the post-login redirect destination (FR-016). Only a path
 * that stays inside the admin area is honoured; anything else —
 * missing, the login page itself, protocol-relative ("//host"),
 * absolute with a scheme ("https://..."), or carrying a backslash
 * (a classic open-redirect bypass on some URL parsers) — falls back to
 * `/admin`.
 */
export function safeAdminReturnPath(next?: string | null): string {
  if (!next) return "/admin";
  if (!next.startsWith("/admin/")) return "/admin";
  if (next.includes("//")) return "/admin";
  if (next.includes(":")) return "/admin";
  if (next.includes("\\")) return "/admin";
  if (next === "/admin/login") return "/admin";
  return next;
}

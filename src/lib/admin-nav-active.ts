/**
 * Like site-shell's isNavItemActive, but with "/admin" (the Overview
 * section) as the exact-match root instead of "/" — the public nav's
 * helper only special-cases "/" itself, so reusing it unmodified would
 * mark Overview active on every admin sub-page (e.g. /admin/news).
 */
export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

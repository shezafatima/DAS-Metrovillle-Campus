/**
 * Admin area copy and navigation structure (Constitution VI — page copy
 * lives in content files, not hardcoded inside components).
 */

export interface AdminNavItem {
  label: string;
  href: string;
}

// Fixed order per FR-021: Overview, News, Messages, Signups, Settings.
export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "News", href: "/admin/news" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Signups", href: "/admin/signups" },
  { label: "Settings", href: "/admin/settings" },
];

export const loginCopy = {
  title: "Admin sign in",
  emailLabel: "Email",
  passwordLabel: "Password",
  submit: "Sign in",
  logout: "Logout",
  errors: {
    // Identical for wrong email, wrong password, and non-existent
    // account (FR-009) — never reveals which case applies.
    generic: "The email or password is incorrect.",
    blocked: "Too many attempts. Please try again later.",
    unavailable: "The service is temporarily unavailable. Please try again later.",
  },
} as const;

export const placeholderCopy = {
  comingSoon: "This section hasn't been built yet — its content is coming in a later feature.",
} as const;

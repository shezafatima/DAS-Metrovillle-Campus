import { cookies } from "next/headers";
import { requireAdminPage } from "@/lib/dal";
import { AdminShell } from "@/components/admin/admin-shell";
import { getNotificationsSummary } from "@/lib/notifications/queries";
import { visibleNavItems } from "@/content/admin";

/**
 * Shell data only. This layout is NOT an access gate: layouts don't
 * re-render on client-side navigation and don't stop child routes or Server
 * Actions from running (Next.js authentication guide, "Layouts and auth
 * checks"), so every page, route and action checks access itself (011).
 * What is computed here — the sidebar list and the bell's counts — is
 * presentation, filtered to what this user may use.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage("any");

  // "Remember the open/closed choice between visits" — read server-side
  // so the first paint already matches, no flash of the wrong state.
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("admin-sidebar-state")?.value;
  const defaultSidebarOpen = sidebarState !== "collapsed";

  // A count failure must never break every admin page — the bell/sidebar
  // badges just fall back to hidden (0) rather than the whole layout erroring.
  const { messagesNew, applicationsNew } = await getNotificationsSummary(session).catch(() => ({
    messagesNew: 0,
    applicationsNew: 0,
    items: [],
  }));

  return (
    <AdminShell
      email={session.email}
      allowedHrefs={visibleNavItems(session).map((item) => item.href)}
      defaultSidebarOpen={defaultSidebarOpen}
      initialMessagesNew={messagesNew}
      initialApplicationsNew={applicationsNew}
    >
      {children}
    </AdminShell>
  );
}

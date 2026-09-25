import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/dal";
import { AdminShell } from "@/components/admin/admin-shell";
import { countNewMessages } from "@/lib/messages/admin-queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  // "Remember the open/closed choice between visits" — read server-side
  // so the first paint already matches, no flash of the wrong state.
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("admin-sidebar-state")?.value;
  const defaultSidebarOpen = sidebarState !== "collapsed";

  // A count failure must never break every admin page — the sidebar
  // badge just falls back to hidden (0) rather than the whole layout erroring.
  const newMessagesCount = await countNewMessages().catch(() => 0);

  return (
    <AdminShell email={session!.email} defaultSidebarOpen={defaultSidebarOpen} newMessagesCount={newMessagesCount}>
      {children}
    </AdminShell>
  );
}

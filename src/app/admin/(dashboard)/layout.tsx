import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/dal";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  // "Remember the open/closed choice between visits" — read server-side
  // so the first paint already matches, no flash of the wrong state.
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("admin-sidebar-state")?.value;
  const defaultSidebarOpen = sidebarState !== "collapsed";

  return (
    <AdminShell email={session!.email} defaultSidebarOpen={defaultSidebarOpen}>
      {children}
    </AdminShell>
  );
}

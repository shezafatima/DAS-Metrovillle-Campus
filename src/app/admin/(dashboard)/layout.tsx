import { requireAdminSession } from "@/lib/dal";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  return <AdminShell email={session!.email}>{children}</AdminShell>;
}

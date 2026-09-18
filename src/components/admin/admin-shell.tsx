import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";

interface AdminShellProps {
  email: string;
  children: ReactNode;
}

// Sidebar visible at lg+ (1024px), collapsed behind AdminMobileNav's menu
// button below it (FR-023) — the same lg: breakpoint the public nav
// already uses (research.md §12).
export function AdminShell({ email, children }: AdminShellProps) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden lg:block">
        <AdminSidebar />
      </aside>
      <div className="flex min-h-full flex-1 flex-col">
        <AdminTopBar email={email} menuSlot={<AdminMobileNav />} />
        <main id="admin-content" className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

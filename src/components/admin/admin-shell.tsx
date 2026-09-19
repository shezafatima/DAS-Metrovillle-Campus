import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { Toaster } from "@/components/ui/toaster";

interface AdminShellProps {
  email: string;
  /** Server-read cookie value (FR-023 "remember the choice between visits") — avoids a flash of the wrong state. */
  defaultSidebarOpen: boolean;
  children: ReactNode;
}

export function AdminShell({ email, defaultSidebarOpen, children }: AdminShellProps) {
  return (
    <div className="admin-theme min-h-full bg-background text-foreground">
      <SidebarProvider defaultOpen={defaultSidebarOpen} className="min-h-full">
        <AppSidebar />
        <SidebarInset>
          <AdminTopBar email={email} />
          <main id="admin-content" className="flex-1 overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </div>
  );
}

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { Toaster } from "@/components/ui/toaster";
import { NotificationsProvider } from "@/components/admin/notifications/notifications-provider";
import { PageTitleBadge } from "@/components/admin/notifications/page-title-badge";

interface AdminShellProps {
  email: string;
  /** Sections this user may use (011) — sidebar presentation only; pages and routes enforce access themselves. */
  allowedHrefs: readonly string[];
  /** Server-read cookie value (FR-023 "remember the choice between visits") — avoids a flash of the wrong state. */
  defaultSidebarOpen: boolean;
  /** SSR-computed counts (009) seeding NotificationsProvider — the bell/sidebar's flash-free first paint. */
  initialMessagesNew: number;
  initialSignupsNew: number;
  children: ReactNode;
}

export function AdminShell({
  email,
  allowedHrefs,
  defaultSidebarOpen,
  initialMessagesNew,
  initialSignupsNew,
  children,
}: AdminShellProps) {
  return (
    <NotificationsProvider initialMessagesNew={initialMessagesNew} initialSignupsNew={initialSignupsNew}>
      <PageTitleBadge />
      {/* flex-1 is required here: the root layout's <body> is itself a
      flex column, and a flex-col container does NOT stretch its
      children along the main (vertical) axis by default — without
      flex-1 this whole area only sizes to its content's height
      instead of filling the viewport, which is what made the sidebar
      look cut off partway down instead of running the full height. */}
      <div className="admin-theme flex min-h-full flex-1 flex-col bg-background text-foreground">
        <SidebarProvider defaultOpen={defaultSidebarOpen} className="h-full flex-1">
          <AppSidebar allowedHrefs={allowedHrefs} />
          <SidebarInset>
            <AdminTopBar email={email} />
            <main id="admin-content" className="flex-1 overflow-x-hidden">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </div>
    </NotificationsProvider>
  );
}

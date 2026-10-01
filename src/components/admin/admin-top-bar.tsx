"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { adminExtraPageTitles, adminNavItems } from "@/content/admin";
import { isAdminNavItemActive } from "@/lib/admin-nav-active";
import { NotificationBell } from "@/components/admin/notifications/notification-bell";
import { ProfileMenu } from "@/components/admin/profile-menu";

function currentPageTitle(pathname: string): string {
  const match = adminNavItems.find((item) => isAdminNavItemActive(pathname, item.href));
  return match?.label ?? adminExtraPageTitles[pathname] ?? "Admin";
}

/**
 * The page title, then at the right corner the profile menu (email,
 * Account, Logout — 010) immediately left of the bell (009).
 */
export function AdminTopBar({ email }: { email: string }) {
  const pathname = usePathname();
  const title = currentPageTitle(pathname);

  return (
    <div className="flex h-admin-topbar items-center justify-between gap-2 border-b border-border bg-background px-4">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <h2 className="truncate font-bold text-base text-foreground">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ProfileMenu email={email} />
        <NotificationBell />
      </div>
    </div>
  );
}

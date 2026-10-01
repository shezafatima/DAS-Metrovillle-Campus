"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, Newspaper, Settings, UserPlus, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { adminNavItems } from "@/content/admin";
import { isAdminNavItemActive } from "@/lib/admin-nav-active";
import { NotificationBadge } from "@/components/admin/notifications/notification-badge";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

const iconByHref: Record<string, React.ComponentType<{ className?: string }>> = {
  "/admin": LayoutDashboard,
  "/admin/news": Newspaper,
  "/admin/messages": Mail,
  "/admin/signups": UserPlus,
  "/admin/settings": Settings,
  "/admin/users": Users,
};

/** Counts for the Messages and Signups badges — both from the one shared NotificationsProvider (spec FR-014). */
const badgeCountByHref: Record<string, "messagesNew" | "signupsNew"> = {
  "/admin/messages": "messagesNew",
  "/admin/signups": "signupsNew",
};

/**
 * Email + logout moved to the top bar's profile menu (010 FR-004) — one logout control.
 *
 * 011: `allowedHrefs` is the server-computed list of sections this user may
 * use. It only decides what to SHOW — every page, route and action enforces
 * access itself (Constitution III), so a missing item here is presentation.
 */
export function AppSidebar({ allowedHrefs }: { allowedHrefs: readonly string[] }) {
  const pathname = usePathname();
  const { messagesNew, signupsNew, loading } = useNotifications();
  const countByHref = { messagesNew, signupsNew };

  return (
    <Sidebar>
      <SidebarContent className="pt-3">
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {adminNavItems.filter((item) => allowedHrefs.includes(item.href)).map((item) => {
              const Icon = iconByHref[item.href];
              const isActive = isAdminNavItemActive(pathname, item.href);
              const countKey = badgeCountByHref[item.href];
              const count = countKey ? countByHref[countKey] : 0;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    href={item.href}
                    isActive={isActive}
                    tooltip={item.label}
                    icon={<Icon className="size-4 shrink-0" aria-hidden="true" />}
                  >
                    {item.label}
                  </SidebarMenuButton>
                  {countKey && (
                    <SidebarMenuBadge>
                      <NotificationBadge count={count} pending={loading} />
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

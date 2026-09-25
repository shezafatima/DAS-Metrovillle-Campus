"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, Newspaper, Settings, UserPlus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { adminNavItems } from "@/content/admin";
import { isAdminNavItemActive } from "@/lib/admin-nav-active";

const iconByHref: Record<string, React.ComponentType<{ className?: string }>> = {
  "/admin": LayoutDashboard,
  "/admin/news": Newspaper,
  "/admin/messages": Mail,
  "/admin/signups": UserPlus,
  "/admin/settings": Settings,
};

interface AppSidebarProps {
  /** Non-deleted messages with status new (008); refreshed by router.refresh() after every message mutation. */
  newMessagesCount?: number;
}

export function AppSidebar({ newMessagesCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarContent className="pt-3">
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {adminNavItems.map((item) => {
              const Icon = iconByHref[item.href];
              const isActive = isAdminNavItemActive(pathname, item.href);
              const showBadge = item.href === "/admin/messages" && newMessagesCount > 0;
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
                  {showBadge && (
                    <SidebarMenuBadge>
                      <Badge variant="highlight">{newMessagesCount}</Badge>
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, Newspaper, Settings, UserPlus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
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
  /** Count of unread messages, shown as a highlight badge on the Messages item. Wired to real data in a later feature — 0 for now. */
  newMessagesCount?: number;
}

export function AppSidebar({ newMessagesCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Image
            src="/images/logo.svg"
            alt="Dar-e-Arqam School Metroville Campus"
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-sm bg-white/95 p-0.5"
          />
          <span className={collapsed ? "lg:hidden" : "font-bold text-sm text-sidebar-foreground"}>
            Dar-e-Arqam Admin
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
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

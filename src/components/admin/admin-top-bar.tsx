"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { adminNavItems, loginCopy } from "@/content/admin";
import { isAdminNavItemActive } from "@/lib/admin-nav-active";
import { logout } from "@/app/admin/(dashboard)/actions";

interface AdminTopBarProps {
  email: string;
}

function currentPageTitle(pathname: string): string {
  const match = adminNavItems.find((item) => isAdminNavItemActive(pathname, item.href));
  return match?.label ?? "Admin";
}

export function AdminTopBar({ email }: AdminTopBarProps) {
  const pathname = usePathname();
  const title = currentPageTitle(pathname);

  return (
    <div className="flex h-admin-topbar items-center justify-between gap-2 border-b border-border bg-background px-4">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <h2 className="truncate font-bold text-base text-foreground">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="max-w-32 truncate font-light text-sm text-muted-foreground sm:max-w-none">{email}</span>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            {loginCopy.logout}
          </Button>
        </form>
      </div>
    </div>
  );
}

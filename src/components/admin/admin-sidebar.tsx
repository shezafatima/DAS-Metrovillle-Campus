"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { adminNavItems } from "@/content/admin";
import { isAdminNavItemActive } from "@/lib/admin-nav-active";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex h-full w-admin-sidebar flex-col bg-primary py-4">
      <ul className="flex flex-col">
        {adminNavItems.map((item) => {
          const isActive = isAdminNavItemActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block border-l-4 px-4 py-2.5 font-button text-sm",
                  isActive
                    ? "border-accent bg-white/10 text-surface"
                    : "border-transparent text-surface/80 hover:bg-white/5 hover:text-surface",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

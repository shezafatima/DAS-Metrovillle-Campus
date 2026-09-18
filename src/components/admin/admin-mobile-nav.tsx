"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@base-ui/react/drawer";
import { Menu, X } from "lucide-react";
import { cn } from "cn";
import { adminNavItems } from "@/content/admin";
import { isAdminNavItemActive } from "@/lib/admin-nav-active";

// Same Drawer primitive as the public site's NavMobile (Constitution VI —
// shared primitives, not duplicated): focus trap, scroll lock, and
// Escape/backdrop-click dismissal with focus return to the trigger come
// from the primitive itself (FR-023).
export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger
        aria-label="Open menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md p-2 text-text lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
        <span className="font-button text-sm">Menu</span>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/40 motion-safe:transition-opacity motion-safe:duration-(--motion-medium) data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex">
          <Drawer.Popup className="flex h-full w-[80vw] max-w-xs flex-col overflow-y-auto bg-primary p-4 shadow-card outline-none motion-safe:transition-transform motion-safe:duration-(--motion-medium) data-starting-style:-translate-x-full data-ending-style:-translate-x-full">
            <div className="mb-4 flex items-center justify-between">
              <Drawer.Title className="font-button text-sm text-surface">Admin menu</Drawer.Title>
              <Drawer.Close aria-label="Close menu" className="flex items-center justify-center rounded-md p-2 text-surface">
                <X aria-hidden="true" className="size-5" />
              </Drawer.Close>
            </div>
            <nav aria-label="Admin">
              <ul className="flex flex-col">
                {adminNavItems.map((item) => {
                  const isActive = isAdminNavItemActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "block border-l-4 px-3 py-2.5 font-button text-sm",
                          isActive
                            ? "border-accent bg-white/10 text-surface"
                            : "border-transparent text-surface/80",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

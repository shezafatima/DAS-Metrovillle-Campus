"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@base-ui/react/drawer";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "cn";
import {
  navigationItems as defaultNavigationItems,
  type NavigationItem,
} from "@/content/site-shell";
import { isNavItemActive } from "./nav-desktop";
import { isRtlScript } from "@/lib/rtl-text";
import { SearchBox } from "./search-box";

interface NavMobileProps {
  items?: NavigationItem[];
}

// modal (default true) gives focus trap + page-scroll lock for free
// (FR-008, FR-009); Escape/outside-press dismissal and focus return to the
// trigger are also default Drawer behavior — see research.md §5. The Drawer
// is controlled (rather than using Drawer.Close on the links) so the menu
// links stay real <a> elements with their native link role — Drawer.Close's
// render-prop polymorphism forces role="button" onto whatever it wraps.
export function NavMobile({ items = defaultNavigationItems }: NavMobileProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root swipeDirection="right" open={open} onOpenChange={setOpen}>
      <Drawer.Trigger
        aria-label="Open menu"
        className="flex items-center justify-center rounded-md p-2 text-text lg:hidden"
      >
        <Menu aria-hidden="true" className="size-6" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/40 motion-safe:transition-opacity motion-safe:duration-(--motion-medium) data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex justify-end">
          <Drawer.Popup className="flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto bg-surface p-(--container-gutter-x) shadow-card outline-none [transform:translateX(var(--drawer-swipe-movement-x))] motion-safe:transition-transform motion-safe:duration-(--motion-medium) data-starting-style:translate-x-full data-ending-style:translate-x-full">
            <div className="relative mb-4 flex items-center justify-between">
              <Drawer.Title className="font-nav text-nav text-text">
                Menu
              </Drawer.Title>
              <div className="flex items-center gap-1">
                <SearchBox />
                <Drawer.Close
                  aria-label="Close menu"
                  className="flex items-center justify-center rounded-md p-2 text-text"
                >
                  <X aria-hidden="true" className="size-6" />
                </Drawer.Close>
              </div>
            </div>

            <nav aria-label="Mobile menu">
              <Accordion.Root className="flex flex-col">
                {items.map((item) => {
                  const hasChildren = Boolean(item.children?.length);
                  const isActive = isNavItemActive(pathname, item.href);

                  const label = (
                    <>
                      <span
                        dir="auto"
                        className={cn(
                          "font-nav text-nav font-bold uppercase tracking-(--text-nav--letter-spacing)",
                          isRtlScript(item.label) && "font-body-urdu"
                        )}
                      >
                        {item.label}
                      </span>
                      {item.tagline && (
                        <span
                          className={cn(
                            // Same cn()/text-* collision as nav-desktop.tsx: bare
                            // text-nav-tagline gets dropped when merged with
                            // text-primary/text-text-muted below.
                            "block font-body text-(length:--text-nav-tagline) leading-(--text-nav-tagline--line-height) font-normal",
                            isActive ? "text-primary" : "text-text-muted"
                          )}
                        >
                          {item.tagline}
                        </span>
                      )}
                    </>
                  );

                  if (!hasChildren) {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "block border-b border-neutral-100 py-3",
                          isActive ? "text-primary" : "text-text"
                        )}
                      >
                        {label}
                      </Link>
                    );
                  }

                  return (
                    <Accordion.Item
                      key={item.href}
                      className="border-b border-neutral-100"
                    >
                      <Accordion.Header>
                        <Accordion.Trigger className="group flex w-full items-center justify-between py-3 text-text">
                          <span className="flex flex-col items-start">{label}</span>
                          <ChevronDown
                            aria-hidden="true"
                            className="size-4 shrink-0 transition-transform duration-(--motion-fast) group-data-panel-open:rotate-180"
                          />
                        </Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Panel className="overflow-hidden">
                        <ul className="flex flex-col pb-2 pl-4">
                          {item.children!.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={() => setOpen(false)}
                                className="block py-2 font-body text-nav-sub text-text"
                              >
                                <span
                                  dir="auto"
                                  className={cn(isRtlScript(child.label) && "font-body-urdu")}
                                >
                                  {child.label}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion.Root>
            </nav>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

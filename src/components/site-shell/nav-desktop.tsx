"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import {
  navigationItems as defaultNavigationItems,
  type NavigationItem,
} from "@/content/site-shell";
import { isRtlScript } from "@/lib/rtl-text";

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavDesktopProps {
  items?: NavigationItem[];
}

// Grace period before a hovered-open dropdown closes. Without it, the
// dropdown (position: absolute, so it doesn't extend the <li>'s own hit
// box) can close mid-movement as the pointer travels from the trigger down
// into it, making a dropdown link unclickable — reproduced by hovering
// then clicking a child link, not by hover-then-move-away alone, which is
// why it wasn't caught by the open/close assertions alone.
const CLOSE_DELAY_MS = 250;

export function NavDesktop({ items = defaultNavigationItems }: NavDesktopProps) {
  const pathname = usePathname();
  const [openHref, setOpenHref] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const open = (href: string) => {
    cancelScheduledClose();
    setOpenHref(href);
  };

  const scheduleClose = (href: string) => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => {
      setOpenHref((current) => (current === href ? null : current));
    }, CLOSE_DELAY_MS);
  };

  const closeImmediately = (href: string) => {
    cancelScheduledClose();
    setOpenHref((current) => (current === href ? null : current));
  };

  return (
    <nav aria-label="Main menu" className="hidden lg:block">
      <ul className="flex flex-wrap items-center gap-4 xl:gap-6">
        {items.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isActive = isNavItemActive(pathname, item.href);
          const isOpen = hasChildren && openHref === item.href;

          return (
            <li
              key={item.href}
              className="relative"
              onMouseEnter={() => hasChildren && open(item.href)}
              onMouseLeave={() => hasChildren && scheduleClose(item.href)}
              onFocusCapture={() => hasChildren && open(item.href)}
              onBlurCapture={(event) => {
                if (
                  hasChildren &&
                  !event.currentTarget.contains(event.relatedTarget as Node | null)
                ) {
                  closeImmediately(item.href);
                }
              }}
            >
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-haspopup={hasChildren ? "true" : undefined}
                aria-expanded={hasChildren ? isOpen : undefined}
                className="flex flex-col items-center py-2 text-center"
              >
                <span
                  dir="auto"
                  className={cn(
                    // Bare `text-nav` collides with `text-primary`/`text-text` below:
                    // cn()'s runtime doesn't know this project's custom @theme text-*
                    // scale, so it buckets any unrecognized `text-*` class together and
                    // drops the earlier one — silently losing text-nav's font-size and
                    // paired line-height (confirmed via computed style: 24px instead of
                    // 16px). The `(length:...)`/`leading-(...)` arbitrary-variable forms
                    // are unambiguous to cn() (same reason tracking-(...) below is used
                    // instead of relying on text-nav's paired --letter-spacing), so they
                    // survive the merge. font-bold is a real Tailwind keyword and never
                    // had this problem.
                    "font-nav text-(length:--text-nav) leading-(--text-nav--line-height) font-bold uppercase tracking-(--text-nav--letter-spacing) transition-colors duration-(--motion-fast)",
                    isRtlScript(item.label) && "font-body-urdu",
                    isActive ? "text-primary" : "text-text hover:text-primary"
                  )}
                >
                  {item.label}
                </span>
                {item.tagline && (
                  <span
                    className={cn(
                      // Hidden at the tightest desktop width (1024-1279px) only
                      // — 8 items' taglines don't fit alongside the logo at
                      // their full, unshrunk size there; same size as always
                      // once shown again at xl:. Labels alone still fit at lg.
                      "hidden overflow-hidden font-body text-(length:--text-nav-tagline) leading-(--text-nav-tagline--line-height) xl:block xl:max-h-[calc(1rem*(1-var(--shrink,0)))] xl:opacity-[calc(1-var(--shrink,0)*1.6)]",
                      isActive ? "text-primary" : "text-text-muted"
                    )}
                  >
                    {item.tagline}
                  </span>
                )}
              </Link>
              {hasChildren && (
                <ul
                  // Always mounted, toggled via visibility rather than
                  // conditional rendering — a conditionally-*mounted* dropdown
                  // could be torn down and its links' DOM nodes destroyed
                  // mid-click if isOpen flips during the pointer's travel
                  // from the trigger into the menu, intermittently making a
                  // dropdown link fail to navigate (reproduced in testing:
                  // hover then click a child link, not caught by hover-only
                  // open/close assertions). Toggling visibility keeps the
                  // link nodes stable for the whole interaction.
                  className={cn(
                    "absolute left-0 top-full z-20 w-max min-w-40 max-w-64 rounded-md bg-surface py-2 shadow-card",
                    isOpen ? "visible opacity-100" : "invisible opacity-0"
                  )}
                >
                  {item.children!.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        tabIndex={isOpen ? undefined : -1}
                        className="block px-4 py-1.5 font-body text-nav-sub text-text hover:bg-neutral-100 hover:text-primary"
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
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

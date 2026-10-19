"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsCopy } from "@/content/admin";
import { cn } from "cn";

export interface SettingsTabLink {
  key: string;
  label: string;
  href: string;
}

/**
 * The Settings tab bar (014, contracts/tabs-and-panels.md): one link per tab
 * the user may open, computed on the server (presentation only; every tab
 * page checks access itself). Each tab is its own page, so this is site
 * navigation with aria-current, not an ARIA tablist, and the tab's
 * unsaved-changes guard sees a tab change as a link click.
 *
 * One row at every width: the bar scrolls sideways on its own and the page
 * never does. The active tab, and any tab reached with the keyboard, is
 * scrolled into view. Album pages (/admin/settings/resources/gallery/<id>)
 * keep Resources active.
 */
export function SettingsNav({ tabs }: { tabs: readonly SettingsTabLink[] }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label={settingsCopy.tabsNavLabel} className="min-w-0 max-w-full overflow-x-auto" data-testid="settings-tabs">
      <ul className="flex w-max min-w-full flex-nowrap gap-1 border-border border-b">
        {tabs.map(({ key, label, href }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={key} className="shrink-0">
              <Link
                ref={active ? activeRef : undefined}
                href={href}
                aria-current={active ? "page" : undefined}
                onFocus={(event) => event.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest" })}
                className={cn(
                  "-mb-px block whitespace-nowrap border-b-2 px-3 py-2 font-light text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

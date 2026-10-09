"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsCopy } from "@/content/admin";
import { GROUP_KEYS } from "@/lib/settings/types";
import { cn } from "cn";

/**
 * Links to the four settings groups, one URL each (research R9), so the
 * existing unsaved-changes link guard covers switching between groups, plus
 * the Photo gallery (007), which is no longer a group but lives in the same
 * area and permission. On narrow screens the links wrap, so the page never
 * scrolls sideways.
 */
const LINKS = [
  ...GROUP_KEYS.map((key) => ({ key, href: `/admin/settings/${key}`, label: settingsCopy.groups[key].title })),
  { key: "gallery", href: "/admin/settings/gallery", label: settingsCopy.groups.gallery.title },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label={settingsCopy.navLabel} className="flex flex-wrap gap-2">
      {LINKS.map(({ key, href, label }) => {
        // The gallery's album pages (/admin/settings/gallery/<id>) keep its link active.
        const active = pathname === href || (key === "gallery" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 font-light text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

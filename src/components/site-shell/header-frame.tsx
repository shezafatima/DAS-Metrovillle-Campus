"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * The site header (FR-016). It is white on every page, sticky at every width,
 * and has one fixed height (`--header-h`), so scrolling never changes the page
 * height: no layout shift and no 1px page-height flip.
 *
 * On the home page the header's bottom margin is pulled back by its own height
 * (`-mb-(--header-h)`), so the full-height hero starts at the very top of the
 * page and the white header sits over its top edge.
 */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const isHome = usePathname() === "/";
  return (
    <header className={cn("sticky top-0 z-30 h-(--header-h) border-b border-neutral-100 bg-surface", isHome && "-mb-(--header-h)")}>
      {children}
    </header>
  );
}

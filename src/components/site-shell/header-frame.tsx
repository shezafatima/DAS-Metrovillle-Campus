"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "cn";

/** Scroll distance (px) after which the home header turns from transparent to solid. */
export const SOLID_AFTER = 10;

/**
 * The site header (FR-016). It is sticky at every width and has one fixed
 * height (`--header-h`), so scrolling never changes the page height: no
 * layout shift, no gap while scrolling starts, and no 1px page-height flip.
 *
 * On the home page it is transparent over the hero until the visitor scrolls,
 * then turns solid. A dark gradient scrim behind the transparent state keeps
 * the logo and the white links readable over any slide the school uploads. Every
 * other page is solid from the top. Children restyle themselves with the
 * `group-data-[transparent=true]/header:` variant, so the frame is the only
 * client code involved.
 *
 * On the home page the header's bottom margin is pulled back by its own height
 * (`-mb-(--header-h)`), so the hero starts at the very top of the page and
 * sits behind the header.
 */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const isHome = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SOLID_AFTER);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const transparent = isHome && !scrolled;

  return (
    <header
      data-transparent={transparent}
      className={cn(
        "group/header sticky top-0 z-30 h-(--header-h) border-b motion-safe:transition-colors motion-safe:duration-(--motion-medium)",
        isHome && "-mb-(--header-h)",
        transparent ? "border-transparent bg-transparent" : "border-neutral-100 bg-surface",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[140%] bg-linear-to-b from-black/75 via-black/60 to-transparent opacity-0 motion-safe:transition-opacity motion-safe:duration-(--motion-medium) group-data-[transparent=true]/header:opacity-100"
      />
      {children}
    </header>
  );
}

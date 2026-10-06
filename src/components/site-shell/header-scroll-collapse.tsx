"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "cn";

/** Scroll distance (px) over which the desktop header shrinks from full size to compact. */
export const SHRINK_RANGE = 160;

/**
 * The site header (FR-016). From the lg breakpoint it is sticky and shrinks
 * as the page scrolls: the yellow top bar slides away, the white bar's
 * padding tightens, the logo gets smaller and the taglines under the main
 * links fade out. Below lg it is an ordinary block that scrolls away.
 *
 * The shrink is driven by a single CSS variable, `--shrink` (0 = full size,
 * 1 = compact), written straight to the element on scroll (no React state, no
 * re-render), and every size is a `calc()` of it. It is deliberately
 * continuous, not a switch at a threshold: a header that jumps to a smaller
 * size in one step changes the page height under the visitor's scroll
 * position, so the content lurches and the scroll position stutters (the
 * glitch seen at the start of scrolling). Shrinking in step with the scroll
 * moves the content smoothly instead. Scroll anchoring is turned off for the
 * page (globals.css) because it would otherwise "correct" the scroll position
 * while the header's height changes.
 */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const shrink = Math.min(1, Math.max(0, window.scrollY / SHRINK_RANGE));
      element.style.setProperty("--shrink", shrink.toFixed(3));
      element.dataset.scrolled = shrink >= 1 ? "true" : "false";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={ref} data-scrolled="false" className="group/header z-30 border-b border-neutral-100 bg-surface lg:sticky lg:top-0">
      {children}
    </header>
  );
}

/** The yellow top bar's wrapper: slides away (desktop only) as the header shrinks. */
export function HeaderTopBarCollapse({ children }: { children: ReactNode }) {
  return <div className={cn("overflow-hidden lg:max-h-[calc(4rem*(1-var(--shrink,0)))]")}>{children}</div>;
}

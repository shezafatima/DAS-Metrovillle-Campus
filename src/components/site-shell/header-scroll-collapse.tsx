"use client";

import { useState, type ReactNode } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "cn";

const SCROLL_SHRINK_THRESHOLD = 24;

interface HeaderScrollCollapseProps {
  children: ReactNode;
}

// Collapses its children (the top bar) once the page scrolls past a small
// threshold — the desktop-only "shrink on scroll" half of FR-016 (see the
// comment in header.tsx). Isolated to its own client component so Header
// stays a Server Component; sticky positioning itself is plain CSS and
// needs no JS.
export function HeaderScrollCollapse({ children }: HeaderScrollCollapseProps) {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > SCROLL_SHRINK_THRESHOLD);
  });

  return (
    <div
      className={cn(
        "overflow-hidden motion-safe:transition-[max-height] motion-safe:duration-(--motion-medium)",
        scrolled ? "lg:max-h-0" : "lg:max-h-16"
      )}
    >
      {children}
    </div>
  );
}

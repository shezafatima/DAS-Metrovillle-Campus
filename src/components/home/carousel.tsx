"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { homeContent } from "@/content/home";
import { cn } from "cn";

export interface CarouselProps {
  /** Names the region and the arrow buttons ("Dar-e-Arqam Books"). */
  label: string;
  children: React.ReactNode;
  /**
   * Tailwind classes setting `--pv` (items visible at once) per width, from
   * research/design-tokens.md "Carousels — items visible at once".
   */
  perViewClass: string;
  /** Advance by itself every N ms (paused on hover/focus, off for reduced motion). */
  autoplayMs?: number;
  /** Arrow colour scheme for dark or light bands. */
  tone?: "light" | "dark";
  className?: string;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The shared home carousel (006 research R3): a horizontal scroll-snap track,
 * so swipe, trackpad and keyboard scrolling work natively and nothing is
 * clipped. Previous/next scroll by one page and wrap at the ends; they are
 * hidden when every item fits. Autoplay, when asked for, pauses while the
 * pointer is over it, while focus is inside, and while the tab is hidden,
 * and never runs for visitors who prefer reduced motion (FR-024, FR-033,
 * FR-036). No library (Constitution II).
 */
export function Carousel({ label, children, perViewClass, autoplayMs, tone = "light", className }: CarouselProps) {
  const track = useRef<HTMLUListElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [paused, setPaused] = useState(false);
  const items = Children.toArray(children);

  const measure = useCallback(() => {
    const el = track.current;
    if (el) setOverflows(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items.length]);

  const go = useCallback((direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    const atStart = el.scrollLeft <= 2;
    if (direction === 1 && atEnd) el.scrollTo({ left: 0, behavior });
    else if (direction === -1 && atStart) el.scrollTo({ left: el.scrollWidth, behavior });
    else el.scrollBy({ left: direction * el.clientWidth, behavior });
  }, []);

  useEffect(() => {
    if (!autoplayMs || !overflows || paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) go(1);
    }, autoplayMs);
    return () => window.clearInterval(timer);
  }, [autoplayMs, overflows, paused, go]);

  const arrow = cn(
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full p-2 shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
    tone === "dark" ? "bg-white/90 text-primary hover:bg-white" : "bg-primary text-white hover:bg-cta-hover",
  );

  return (
    <div
      className={cn("relative", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-testid="carousel"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={(event) => {
        // Pause for keyboard focus only. A mouse click on an arrow also focuses it,
        // and that must not stop the slider for good (:focus-visible is false then).
        if (event.target.matches(":focus-visible")) setPaused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <ul
        ref={track}
        className={cn(
          "flex snap-x snap-mandatory gap-(--spacing-home-carousel-gap) overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          perViewClass,
        )}
      >
        {items.map((child, index) => (
          <li
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={homeContent.carousel.position(index + 1, items.length)}
            className="flex-none snap-start [width:calc((100%-(var(--pv)-1)*var(--spacing-home-carousel-gap))/var(--pv))]"
          >
            {child}
          </li>
        ))}
      </ul>
      {overflows && (
        <>
          <button type="button" className={cn(arrow, "left-1")} aria-label={homeContent.carousel.previous(label)} onClick={() => go(-1)}>
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button type="button" className={cn(arrow, "right-1")} aria-label={homeContent.carousel.next(label)} onClick={() => go(1)}>
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </>
      )}
    </div>
  );
}

/** Items visible at once for the Books and Partners carousels: 1 below 1024px, 5 from 1024px, 4 from 1200px (design-tokens "Carousels"). */
export const BAND_CAROUSEL_PER_VIEW = "[--pv:1] lg:[--pv:5] min-[1200px]:[--pv:4]";

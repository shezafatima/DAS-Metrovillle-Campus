"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 2000; // the reference's duration is not readable (design-tokens "Extraction gaps"); spec Assumption

function reducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * One progress-dashboard number (006 FR-020, FR-021). The server renders the
 * final value, so the page reads correctly without JavaScript; in the
 * browser it counts up from zero once, when it first scrolls into view.
 * Visitors who prefer reduced motion always see the final value.
 */
export function StatCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || typeof IntersectionObserver === "undefined") {
      setShown(value);
      return;
    }
    setShown(0);
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / DURATION_MS);
          setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} data-testid="stat-value" data-value={value}>
      {shown}
    </span>
  );
}

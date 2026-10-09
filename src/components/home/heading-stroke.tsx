"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A yellow pencil-style stroke under a section heading, drawn in once, the first
 * time it scrolls into view (decorative: `aria-hidden`). Used through
 * `SectionHeading`'s `stroke` prop, so any heading can have it.
 *
 * It fills the width of whatever wraps it, so under a heading that wraps it stays
 * under the widest line. Three strokes (two long, one short) draw in one after another, at an uneven pace with short pauses, like a hand moving a pencil. The drawing animates `stroke-dashoffset` only (paint, no
 * layout); the CSS is `.heading-stroke` in globals.css, where reduced motion simply
 * shows the finished stroke.
 */
export function HeadingStroke() {
  const ref = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);
  const filterId = `pencil-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setDrawn(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.9 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      focusable="false"
      data-testid="heading-stroke"
      data-drawn={drawn}
      viewBox="0 0 200 26"
      preserveAspectRatio="none"
      className="heading-stroke mt-2 block h-6 w-full"
    >
      <defs>
        {/* Roughens the edges a little, so the lines look like pencil, not vector. */}
        <filter id={filterId} x="-4%" y="-60%" width="108%" height="220%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {/* Two long strokes and a short one, wobbling like a hand-drawn scribble back and forth. */}
      <g fill="none" stroke="var(--color-topbar)" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${filterId})`}>
        <path d="M3 7 C 14 3.5, 22 8.5, 36 5.5 S 58 2.5, 74 7.5 S 98 9.5, 112 4.5 S 142 2, 158 6 S 184 8, 197 4.5" pathLength={1} />
        <path d="M194 14.5 C 180 11, 168 17, 150 13 S 124 10.5, 108 15.5 S 76 18, 62 12.5 S 30 11, 8 15" pathLength={1} opacity={0.92} />
        <path d="M20 22.5 C 34 20, 44 25, 62 21.5 S 92 19.5, 108 23.5 S 142 22, 156 21" pathLength={1} opacity={0.85} />
      </g>
    </svg>
  );
}

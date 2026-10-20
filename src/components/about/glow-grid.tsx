"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The Core Values grid. It only reports whether it is on screen, so the cards'
 * travelling glow (globals.css `.about-value-card`) can pause when it is not.
 * Without JavaScript the glow simply keeps running.
 */
export function AboutGlowGrid({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <ul ref={ref} className={className} data-offscreen={offscreen ? "true" : "false"}>
      {children}
    </ul>
  );
}

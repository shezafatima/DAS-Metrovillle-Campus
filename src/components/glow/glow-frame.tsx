"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "cn";
import { GlowLayers } from "./glow-layers";

/**
 * A solid face inside the travelling gold border, for content that must stay readable (a form). The border
 * pauses while it is off screen, while any control inside has focus, and while the pointer is over it, and
 * resumes after (globals.css `[data-glow-paused]`). Without JavaScript it keeps running; under
 * prefers-reduced-motion the CSS shows a static gold ring instead.
 */
export function GlowFrame({ className, faceClassName, children }: { className?: string; faceClassName?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("about-value-card rounded-xl", className)}
      data-offscreen={offscreen ? "true" : "false"}
      data-glow-paused={focused || hovered ? "true" : "false"}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <GlowLayers />
      <div className={cn("about-value-card-face", faceClassName)}>{children}</div>
    </div>
  );
}

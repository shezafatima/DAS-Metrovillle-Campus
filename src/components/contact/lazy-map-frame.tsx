"use client";

import { useEffect, useRef, useState } from "react";

export interface LazyMapFrameProps {
  src: string;
  title: string;
}

/**
 * Inserts the map iframe's `src` only once the reserved area scrolls
 * into view (FR-024a, SC-012). Native `loading="lazy"` alone loads the
 * map too early, because its distance threshold covers the map's
 * position at 1440px — this component never sets an iframe `src`
 * before the IntersectionObserver actually fires.
 */
export function LazyMapFrame({ src, title }: LazyMapFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      {visible && (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0"
        />
      )}
    </div>
  );
}

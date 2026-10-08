"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ContentImage, SalientFeature } from "@/content/home";

/**
 * The four salient features in a circle (006 FR-012): 90° apart on a ring that turns slowly
 * and continuously, with each item counter-turning, so its icon and heading always stay upright. The school
 * logo sits small in the centre and does not turn.
 *
 *  - The geometry lives in globals.css (`.salient-*`): an item is a third of the ring's width, the largest
 *    size at which two neighbours can never overlap whatever the angle, and every item stays inside the ring's
 *    box, so nothing is clipped as it turns. Only `transform` animates.
 *  - Paused while the pointer is over the ring, while focus is inside it (the ring is focusable, so a keyboard
 *    user can stop it) and while the tab is hidden. Hover does nothing else: the features are not links.
 *  - With reduced motion nothing turns. The same circle is used on phones, just smaller.
 *
 * Markup is a list, in order, each heading an h3; the logo is decorative.
 */
export function SalientRing({
  labelledBy,
  items,
  logo,
  className,
}: {
  labelledBy: string;
  items: Pick<SalientFeature, "id" | "title" | "image">[];
  logo: ContentImage;
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      tabIndex={0}
      data-testid="salient-ring"
      data-paused={hovered || focused || tabHidden}
      className={`salient-ring rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <ul className="salient-list">
        {items.map((item, i) => (
          <li key={item.id} className="salient-item" style={{ "--a": `${i * 90}deg` } as React.CSSProperties} data-testid="salient-item">
            <div className="salient-item-inner">
              <Image src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height} className="salient-icon" />
              <h3 className="salient-title font-bold font-heading text-(--color-home-salient-title) uppercase">{item.title}</h3>
            </div>
          </li>
        ))}
      </ul>
      <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} className="salient-logo" />
    </div>
  );
}

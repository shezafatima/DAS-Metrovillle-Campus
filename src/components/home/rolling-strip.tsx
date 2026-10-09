"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export interface RollItem {
  id: string;
  src: string;
  alt: string;
  /** Accessible name of the link when the item has an `href` (the partner's name). */
  name?: string;
  /** When set, the item is a link; without it, a plain image. */
  href?: string;
  /** Width / height of the image: a logo is as wide as its own shape, up to the cap. */
  aspect?: number;
}

export type RollKind = "cover" | "logo";

/** Slow, steady speed of the rolling strip. */
const SPEED_PX_PER_S = 40;

/**
 * Item sizes in px, per kind and screen (`sm` = below 768px). These MUST match the CSS: the book cover height
 * token and the partner box tokens in globals.css (a unit test checks the partner ones), because the loop's
 * length and speed are worked out from them.
 */
export const ROLL_SIZES = {
  cover: { height: 280, heightSm: 280, gap: 24, gapSm: 24, maxWidth: Infinity, aspect: 400 / 508, minHalf: 1100 },
  logo: { height: 120, heightSm: 92, gap: 88, gapSm: 68, maxWidth: 270, aspect: 1, minHalf: 1300 },
} as const;

const itemPx = (kind: RollKind, aspect: number | undefined, small: boolean) => {
  const s = ROLL_SIZES[kind];
  const height = small ? s.heightSm : s.height;
  return Math.min(s.maxWidth, height * (aspect ?? s.aspect)) + (small ? s.gapSm : s.gap);
};

/**
 * The rolling strip on the home page (006): the Books band's covers, and the Partners logos.
 *
 *  - Three or more items: a loop. The list is repeated until one half of the track is wide enough to fill
 *    the strip, then the whole thing is doubled and the track moves by exactly one half
 *    (`translateX(-50%)`), so the end meets the start with no jump. Only `transform` animates, at a
 *    constant 40px per second on every screen. Every repeated copy is `aria-hidden` with empty alt text, and
 *    a link inside a copy is out of the tab order, so a screen reader hears, and a keyboard user reaches,
 *    each item once. (A visible copy can still be clicked with a mouse.)
 *  - One or two items: a static row, centred, with no animation.
 *  - `direction`: "reverse" runs the strip the other way. `pauseOnHover` (default on) pauses it while the
 *    pointer is over it. It always pauses while focus is inside it (the strip is focusable, so a keyboard
 *    user can stop it, and so is any link in it) and while the tab is hidden.
 *  - With reduced motion there is no animation: the copies are hidden and the row is a plain swipeable one
 *    (see the `prefers-reduced-motion` block in globals.css).
 *  - `fadeColor`: the edges fade into the colour of the section the strip sits in (navy for the books).
 *  - `kind="logo"`: each item is as wide as its own logo, up to a cap, at a small fixed height, with an equal
 *    gap (the partner tokens in globals.css).
 */
export function RollingStrip({
  label,
  items: source,
  kind = "cover",
  direction = "forward",
  pauseOnHover = true,
  fadeColor = "var(--color-primary)",
}: {
  label: string;
  items: RollItem[];
  kind?: RollKind;
  direction?: "forward" | "reverse";
  pauseOnHover?: boolean;
  fadeColor?: string;
}) {
  const loops = source.length >= 3;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const listPxSmall = source.reduce((sum, item) => sum + itemPx(kind, item.aspect, true), 0);
  const listPx = source.reduce((sum, item) => sum + itemPx(kind, item.aspect, false), 0);
  const repeats = loops ? Math.max(1, Math.ceil(ROLL_SIZES[kind].minHalf / Math.min(listPx, listPxSmall))) : 1;
  const half = Array.from({ length: repeats }, (_, r) => source.map((item) => ({ ...item, key: `${item.id}-${r}`, copy: r > 0 })));
  const items = loops ? [...half.flat(), ...half.flat().map((item) => ({ ...item, key: `${item.key}-b`, copy: true }))] : half.flat();
  const paused = (pauseOnHover && hovered) || focused || tabHidden;
  const prefix = kind === "cover" ? "book" : "partner";

  return (
    <div
      role="group"
      aria-label={label}
      tabIndex={0}
      data-testid={`${prefix}-roll`}
      data-kind={kind}
      data-mode={loops ? "loop" : "static"}
      data-direction={direction}
      data-paused={paused}
      className={`roll-strip relative min-w-0 rounded-md outline-none focus-visible:ring-2 ${kind === "cover" ? "focus-visible:ring-white" : "focus-visible:ring-ring"}`}
      style={{ "--roll-fade": fadeColor } as React.CSSProperties}
      onPointerEnter={pauseOnHover ? (event) => event.pointerType === "mouse" && setHovered(true) : undefined}
      onPointerLeave={pauseOnHover ? (event) => event.pointerType === "mouse" && setHovered(false) : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <ul
        className="roll-track"
        style={{ "--roll-duration": `${(repeats * listPx) / SPEED_PX_PER_S}s`, "--roll-duration-sm": `${(repeats * listPxSmall) / SPEED_PX_PER_S}s` } as React.CSSProperties}
      >
        {items.map((item) => {
          // Eager, copies included: a copy that was still lazy could be blank when it rolled into view, leaving a gap in the strip.
          const image = <Image src={item.src} alt={item.copy ? "" : item.alt} fill sizes={kind === "cover" ? "221px" : "120px"} loading="eager" className="object-contain" />;
          return (
            <li
              key={item.key}
              className="roll-item"
              style={{ "--ar": item.aspect ?? ROLL_SIZES[kind].aspect } as React.CSSProperties}
              data-copy={item.copy || undefined}
              data-testid={item.copy ? `${prefix}-${kind === "cover" ? "cover" : "logo"}-copy` : `${prefix}-${kind === "cover" ? "cover" : "logo"}`}
              aria-hidden={item.copy || undefined}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  aria-label={item.copy ? undefined : (item.name ?? item.alt)}
                  tabIndex={item.copy ? -1 : undefined}
                  className="absolute inset-0 block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {image}
                </Link>
              ) : (
                image
              )}
            </li>
          );
        })}
      </ul>
      {loops && (
        <>
          <span aria-hidden="true" className="roll-fade roll-fade-start" />
          <span aria-hidden="true" className="roll-fade roll-fade-end" />
        </>
      )}
    </div>
  );
}

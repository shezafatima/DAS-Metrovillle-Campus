"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "cn";

/** Auto-advance interval: each card is the centre one for 3 seconds. */
const ADVANCE_MS = 3000;
/** After a touch or swipe, auto-advance waits this long with no further interaction. */
const TOUCH_RESUME_MS = 4000;
/** A touch that moves less than this is a tap (it flips the card); more is a drag (it changes the slide). Never both. */
const DRAG_SLOP_PX = 12;
/** A drag past this share of a card step changes the slide; a shorter one snaps back. */
const COMMIT_SHARE = 0.2;

// Coverflow look: the centre card is larger and in focus; the neighbours are smaller and faded; anything
// further is parked invisible. Only transform and opacity change (see .qa-card in globals.css).
const SCALE = { 0: 1.08, 1: 0.82, far: 0.7 };
const OPACITY = { 0: 1, 1: 0.55, far: 0 };

function reducedMotionQuery(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
}

export interface FlipCoverflowItem {
  id: string;
  /** The flip button's accessible name. */
  flipLabel: string;
  /** The slide's accessible name, e.g. "2 of 6". */
  positionLabel: string;
  /** The front face's content; the flip button is laid over it. */
  front: ReactNode;
  /**
   * The back face's content. A function receives whether the card is the centre one (to keep links out of the
   * tab order otherwise); only a client caller can pass one, so a server caller passes plain content.
   */
  back: ReactNode | ((card: { centre: boolean }) => ReactNode);
  frontClassName?: string;
  backClassName?: string;
}

/**
 * A looping coverflow of flip cards (006 FR-008, shared since 020): one card
 * centred and larger, one on each side, scaled down and faded. Auto-advances,
 * drags on touch, and moves with the arrow keys; there are no buttons or dots.
 *
 * Each card's flip control is a button over the front (never one big link,
 * which would navigate on the first tap and hide the back). A back may hold a
 * link (home) or none (the 020 uniform cards). Hover flips it for a mouse, a
 * tap for touch, and keyboard focus reveals the back the same way hover does.
 * Reduced motion cross-fades instead of flipping.
 *
 * Auto-advance never runs for reduced motion or a hidden tab, and waits while
 * the pointer is over the carousel, keyboard focus is inside it, any card is
 * flipped, or the visitor touched it a moment ago.
 */
export function FlipCoverflow({
  items,
  label,
  header,
  as: Root = "section",
  className,
  stageClassName,
  testIdPrefix = "quick-access",
}: {
  items: FlipCoverflowItem[];
  /** The carousel's accessible name. */
  label: string;
  /** Rendered inside the carousel, above the cards. */
  header?: ReactNode;
  /** "div" (with role="group") when the carousel sits inside another section. */
  as?: "section" | "div";
  className?: string;
  /** Card size: sets --qa-w and --qa-h. */
  stageClassName?: string;
  /** Test ids: {prefix}-card, {prefix}-flip. */
  testIdPrefix?: string;
}) {
  const count = items.length;
  const loops = count >= 3;
  const flipTestId = `${testIdPrefix}-flip`;

  // `prev` is the centre card before the last move: it tells which card wrapped round (to fade it in, not slide it across).
  const [{ index, prev }, setPos] = useState<{ index: number; prev: number | null }>({ index: 0, prev: null });
  const [tapped, setTapped] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [overCarousel, setOverCarousel] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);

  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<string>("mouse");
  const suppressClick = useRef(false);
  const touchTimer = useRef<number | null>(null);
  const refocus = useRef(false);
  const gesture = useRef<{ id: number; x: number; y: number; dragging: boolean; step: number; dx: number } | null>(null);

  const anyFlipped = tapped !== null || hovered !== null || focused !== null;

  const move = useCallback(
    (delta: 1 | -1) => {
      setTapped(null);
      setHovered(null);
      setPos((state) => {
        const next = loops ? (state.index + delta + count) % count : Math.min(count - 1, Math.max(0, state.index + delta));
        return next === state.index ? state : { index: next, prev: state.index };
      });
    },
    [count, loops],
  );

  // Reduced motion and tab visibility.
  useEffect(() => {
    const query = reducedMotionQuery();
    if (!query) return;
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    const onVisibility = () => setTabHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      query.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Auto-advance: restarts whenever the card or any pause condition changes.
  const paused = overCarousel || focusInside || anyFlipped || touchPaused || tabHidden || reduced;
  useEffect(() => {
    if (!loops || paused) return;
    const timer = window.setInterval(() => move(1), ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [loops, paused, move, index]);

  // A card flipped by a tap stays flipped (and holds auto-advance) until it is tapped again, a tap lands outside, or Escape.
  useEffect(() => {
    if (tapped === null) return;
    const onDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setTapped(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [tapped]);

  // After an arrow-key move, keep keyboard focus on the new centre card.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    stage.current?.querySelector<HTMLElement>(`[data-qa-index="${index}"] [data-testid="${flipTestId}"]`)?.focus();
  }, [index, flipTestId]);

  useEffect(
    () => () => {
      if (touchTimer.current) window.clearTimeout(touchTimer.current);
    },
    [],
  );

  const offsetOf = (i: number, centre: number) => {
    if (!loops) return i - centre;
    const half = Math.floor(count / 2);
    return ((i - centre + count + half) % count) - half;
  };

  const holdForTouch = () => {
    setTouchPaused(true);
    if (touchTimer.current) window.clearTimeout(touchTimer.current);
    touchTimer.current = window.setTimeout(() => setTouchPaused(false), TOUCH_RESUME_MS);
  };

  const setDrag = (px: number, dragging: boolean) => {
    const el = stage.current;
    if (!el) return;
    el.style.setProperty("--drag", `${px}px`);
    el.dataset.dragging = dragging ? "true" : "false";
  };

  const onPointerDown = (event: React.PointerEvent) => {
    lastPointer.current = event.pointerType;
    if (event.pointerType === "mouse") return;
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-qa-index]");
    const step = (card?.offsetWidth ?? 280) * 0.9;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false, step, dx: 0 };
    if (touchTimer.current) window.clearTimeout(touchTimer.current);
    setTouchPaused(true);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || event.pointerId !== g.id) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.dragging) {
      if (Math.abs(dx) < DRAG_SLOP_PX || Math.abs(dx) < Math.abs(dy)) return;
      g.dragging = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    g.dx = Math.max(-g.step * 1.2, Math.min(g.step * 1.2, dx));
    setDrag(g.dx, true);
  };

  const endGesture = (event: React.PointerEvent, cancelled: boolean) => {
    const g = gesture.current;
    if (!g || event.pointerId !== g.id) return;
    gesture.current = null;
    if (g.dragging) {
      // A drag: change the slide (or snap back) and swallow the click that follows, so it never also flips a card.
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      setDrag(0, false);
      if (!cancelled && Math.abs(g.dx) > g.step * COMMIT_SHARE) move(g.dx < 0 ? 1 : -1);
    }
    holdForTouch();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      refocus.current = true;
      move(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "Escape") {
      setTapped(null);
    }
  };

  return (
    <Root
      ref={root as React.Ref<HTMLDivElement>}
      role={Root === "div" ? "group" : undefined}
      aria-roledescription="carousel"
      aria-label={label}
      className={className}
      onKeyDown={onKeyDown}
      onPointerEnter={(event) => event.pointerType === "mouse" && setOverCarousel(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setOverCarousel(false)}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setFocusInside(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusInside(false);
      }}
    >
      {header}
      <div
        ref={stage}
        data-dragging="false"
        className={cn("qa-stage relative mx-auto w-full", stageClassName)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endGesture(event, false)}
        onPointerCancel={(event) => endGesture(event, true)}
      >
        <ul className="contents">
          {items.map((item, i) => {
            const offset = offsetOf(i, index);
            const far = Math.abs(offset) > 1;
            const centre = offset === 0;
            const wrapped = prev !== null && loops && Math.abs(offset - offsetOf(i, prev)) > 1;
            const flipped = centre && (tapped === i || hovered === i || focused === i);
            const key = far ? "far" : (Math.abs(offset) as 0 | 1);
            return (
              <li
                key={item.id}
                data-qa-index={i}
                data-testid={`${testIdPrefix}-card`}
                data-flipped={flipped}
                data-wrap={wrapped}
                data-centre={centre}
                role="group"
                aria-roledescription="slide"
                aria-label={item.positionLabel}
                className="qa-card"
                style={
                  {
                    "--pos": offset,
                    "--sc": SCALE[key],
                    "--op": OPACITY[key],
                    "--z": far ? 1 : 3 - Math.abs(offset),
                  } as React.CSSProperties
                }
                onPointerEnter={(event) => event.pointerType === "mouse" && centre && setHovered(i)}
                onPointerLeave={(event) => event.pointerType === "mouse" && setHovered((h) => (h === i ? null : h))}
                onFocus={(event) => {
                  if (centre && event.target.matches(":focus-visible")) setFocused(i);
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused((f) => (f === i ? null : f));
                }}
              >
                <div className="qa-inner">
                  <div className={cn("qa-face qa-front", item.frontClassName)}>
                    {item.front}
                    <button
                      type="button"
                      data-testid={flipTestId}
                      aria-label={item.flipLabel}
                      aria-expanded={flipped}
                      tabIndex={centre ? 0 : -1}
                      className="absolute inset-0 rounded-(--radius-home-flip) outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={(event) => {
                        if (suppressClick.current) return event.preventDefault();
                        if (!centre) return move(offset > 0 ? 1 : -1); // a side card comes to the centre first
                        // A mouse flips by hovering; its click must not undo that. Touch, keyboard and screen readers flip on activation.
                        if (lastPointer.current === "mouse" && event.detail > 0) return;
                        setTapped((t) => (t === i ? null : i));
                      }}
                    />
                  </div>
                  <div
                    className={cn("qa-face qa-back", item.backClassName)}
                    onClick={(event) => {
                      // Tapping the back (not a link on it) turns the card over again on touch.
                      if (!(event.target as HTMLElement).closest("a") && lastPointer.current !== "mouse") setTapped(null);
                    }}
                  >
                    {typeof item.back === "function" ? item.back({ centre }) : item.back}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Root>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { homeContent, type QuickAccessTone } from "@/content/home";
import { cn } from "cn";
import { SectionHeading } from "./section-heading";

// Front title colour and back colour per card (design-tokens "Flip cards").
const TONES: Record<QuickAccessTone, { title: string; back: string }> = {
  admission: { title: "text-(--color-home-flip-admission)", back: "bg-(--color-home-flip-admission-back)/90" },
  salient: { title: "text-(--color-home-flip-salient)", back: "bg-(--color-home-flip-salient-back)/90" },
  branch: { title: "text-(--color-home-flip-branch)", back: "bg-(--color-home-flip-branch-back)/90" },
  curriculum: { title: "text-(--color-home-flip-curriculum)", back: "bg-(--color-home-flip-curriculum-back)/90" },
};

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

/**
 * The four quick-access cards as a looping coverflow (006 FR-008): one card centred
 * and larger, one on each side, scaled down and faded. Auto-advances, drags on touch,
 * and moves with the arrow keys; there are no buttons or dots.
 *
 * Each card is a button that flips it (never one big link, which would navigate on the
 * first tap and hide the back); the "Read More" link is a separate element on the
 * back. Hover flips it for a mouse, a tap for touch and keyboard focus reveals the
 * back the same way hover does. Reduced motion cross-fades instead of flipping.
 *
 * Auto-advance never runs for reduced motion or a hidden tab, and waits while the
 * pointer is over the carousel, keyboard focus is inside it, any card is flipped, or
 * the visitor touched it a moment ago.
 */
export function QuickAccessCards() {
  const { cards, readMore, label, flip, heading } = homeContent.quickAccess;
  const count = cards.length;
  const loops = count >= 3;

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
    stage.current?.querySelector<HTMLElement>(`[data-qa-index="${index}"] [data-testid="quick-access-flip"]`)?.focus();
  }, [index]);

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
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label={label}
      className="w-full overflow-x-clip bg-black/10 py-(--spacing-home-band-y)"
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
      <div className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x) pb-8">
        <SectionHeading id="quick-access-heading" heading={heading} stroke />
      </div>
      <div
        ref={stage}
        data-dragging="false"
        className="qa-stage relative mx-auto w-full [--qa-h:22.5rem] [--qa-w:18rem] lg:[--qa-h:21.5rem] lg:[--qa-w:21rem]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endGesture(event, false)}
        onPointerCancel={(event) => endGesture(event, true)}
      >
        <ul className="contents">
          {cards.map((card, i) => {
            const tone = TONES[card.tone];
            const offset = offsetOf(i, index);
            const far = Math.abs(offset) > 1;
            const centre = offset === 0;
            const wrapped = prev !== null && loops && Math.abs(offset - offsetOf(i, prev)) > 1;
            const flipped = centre && (tapped === i || hovered === i || focused === i);
            const key = far ? "far" : (Math.abs(offset) as 0 | 1);
            return (
              <li
                key={card.id}
                data-qa-index={i}
                data-testid="quick-access-card"
                data-flipped={flipped}
                data-wrap={wrapped}
                data-centre={centre}
                role="group"
                aria-roledescription="slide"
                aria-label={homeContent.carousel.position(i + 1, count)}
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
                  <div className="qa-face qa-front flex flex-col items-center justify-center gap-3 rounded-(--radius-home-flip) bg-surface/70 p-(--spacing-home-flip-padding) text-center">
                    <Image src={card.icon.src} alt={card.icon.alt} width={card.icon.width} height={card.icon.height} unoptimized />
                    <h3 className={cn("font-bold font-heading text-(length:--text-home-flip-title) leading-(--text-home-flip-title--line-height)", tone.title)}>{card.title}</h3>
                    <p className="font-body text-(--color-text-muted) text-body">{card.text}</p>
                    <button
                      type="button"
                      data-testid="quick-access-flip"
                      aria-label={flip(card.title)}
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
                    className={cn("qa-face qa-back flex flex-col items-center justify-center gap-3 rounded-(--radius-home-flip) p-(--spacing-home-flip-padding) text-center", tone.back)}
                    onClick={(event) => {
                      // Tapping the back (not its link) turns the card over again on touch.
                      if (!(event.target as HTMLElement).closest("a") && lastPointer.current !== "mouse") setTapped(null);
                    }}
                  >
                    <p aria-hidden="true" className="font-bold font-heading text-(--color-home-flip-back-text) text-h3 uppercase leading-(--text-h3--line-height)">{card.title}</p>
                    <p aria-hidden="true" className="font-body text-body text-white">{card.text}</p>
                    <Link
                      href={card.href}
                      data-testid="quick-access-link"
                      aria-label={`${readMore}: ${card.title}`}
                      tabIndex={centre ? 0 : -1}
                      className="bg-cta px-(--spacing-home-read-more-x) py-(--spacing-home-read-more-y) font-button text-(length:--text-button) font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {readMore}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

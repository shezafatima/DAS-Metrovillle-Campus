"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { homeContent } from "@/content/home";
import { cloudinaryLoader } from "@/lib/news/cloudinary-loader";
import type { PublicHero, PublicSlide } from "@/lib/settings/public";
import type { ImageRef } from "@/lib/settings/types";
import { cn } from "cn";

/** Slide transition time, matching `duration-500` in the slide classes. */
const SLIDE_MS = 500;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * One slide's picture as a single `<picture>`, so a phone downloads only the
 * mobile file and a desktop only the desktop file (two `<Image priority>`s would
 * preload both, which wastes a phone's bandwidth on the biggest image of the
 * page). The first slide is `fetchPriority="high"`/eager (it is the LCP
 * element); the rest are lazy (FR-030). The mobile picture is used below `md`
 * and on portrait screens (a portrait tablet), the desktop picture on
 * landscape screens from `md`.
 *
 * With no mobile picture the desktop banner is the only one, and a wide banner
 * cropped to a phone-shaped box would be unusable, so there it is fitted whole
 * (`object-contain`, letterboxed on the hero's navy) and only fills the box
 * (`object-cover`) on a landscape screen from `md`.
 */
function SlidePicture({ slide, first }: { slide: PublicSlide; first: boolean }) {
  const imageProps = (image: ImageRef, className: string) =>
    getImageProps({
      src: image.url,
      alt: slide.alt,
      fill: true,
      sizes: "100vw",
      // The bundled placeholder slide (no publicId) is a local SVG; everything else is Cloudinary.
      ...(image.publicId === "" ? { unoptimized: true } : { loader: cloudinaryLoader }),
      ...(first ? { fetchPriority: "high" as const, loading: "eager" as const } : {}),
      className,
    }).props;

  if (!slide.mobile) {
    const { ...props } = imageProps(slide.desktop, "object-contain md:landscape:object-cover");
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={slide.alt} />;
  }
  const { srcSet: desktopSrcSet, sizes } = imageProps(slide.desktop, "");
  const mobile = imageProps(slide.mobile, "object-cover");
  return (
    <picture>
      <source media="(min-width: 768px) and (orientation: landscape)" srcSet={desktopSrcSet} sizes={sizes} />
      <img {...mobile} alt={slide.alt} />
    </picture>
  );
}

/**
 * The home hero (006 US1, research R9): the visible Settings slides in
 * order, each with its picture (the mobile picture below `md` when set),
 * optional heading and button. It advances after Settings' display time,
 * pauses while hovered or focused, never advances for reduced motion, and
 * shows dots (no arrows) only with more than one slide (FR-002–FR-005). It is as tall as
 * the screen (100svh, via `.hero-full`), sits under the fixed header, and ends with
 * a scroll cue that jumps to `#after-hero`.
 * Slides move sideways: the new one enters from the right while the old one
 * leaves to the left.
 */
export function HeroSlider({ hero }: { hero: PublicHero }) {
  const slides = hero.slides;
  const [index, setIndex] = useState(0);
  // The slide that was showing before `index`; it stays in view only while it slides out.
  const [leaving, setLeaving] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const many = slides.length > 1;
  const t = homeContent.hero;

  const go = useCallback(
    (to: number) => {
      const next = (to + slides.length) % slides.length;
      if (next === index) return;
      setLeaving(index);
      setIndex(next);
    },
    [index, slides.length],
  );

  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), SLIDE_MS + 100);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  useEffect(() => {
    if (!many || paused || reducedMotion()) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) go(index + 1);
    }, Math.max(3, hero.displaySeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [many, paused, hero.displaySeconds, slides.length, go, index]);

  if (slides.length === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t.label}
      data-testid="hero"
      className="hero-full relative min-h-[26rem] w-full overflow-hidden bg-primary"
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
      {slides.map((slide: PublicSlide, n) => {
        const active = n === index;
        const out = n === leaving;
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={homeContent.carousel.position(n + 1, slides.length)}
            aria-hidden={!active}
            data-testid="hero-slide"
            data-active={active || undefined}
            className={cn(
              "absolute inset-0",
              active && "translate-x-0 motion-safe:transition-transform motion-safe:duration-500",
              out && "pointer-events-none -translate-x-full motion-safe:transition-transform motion-safe:duration-500",
              // Parked off-screen to the right, hidden and without a transition, ready to enter.
              !active && !out && "pointer-events-none invisible translate-x-full",
            )}
          >
            <SlidePicture slide={slide} first={n === 0} />
            {(slide.heading || slide.button) && (
              <div className="relative mx-auto flex h-full max-w-(--container-max-width) flex-col items-start justify-center gap-4 px-(--container-gutter-x) pt-(--header-h) pb-24">
                {slide.heading && (
                  <p dir="auto" className="max-w-2xl break-words font-bold font-heading text-(length:--text-home-heading) text-white leading-(--text-home-heading--line-height) [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]">
                    {slide.heading}
                  </p>
                )}
                {slide.button && (
                  <Link
                    href={slide.button.href}
                    tabIndex={active ? undefined : -1}
                    className="bg-cta px-(--spacing-home-read-more-x) py-(--spacing-home-read-more-y) font-button text-(length:--text-button) font-semibold text-white uppercase transition-colors duration-(--motion-fast) hover:bg-cta-hover"
                  >
                    {slide.button.label}
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}

      {many && (
        <>
          <div className="absolute inset-x-0 bottom-16 flex justify-center gap-2">
            {slides.map((slide, n) => (
              <button
                key={slide.id}
                type="button"
                aria-label={t.goTo(n + 1)}
                aria-current={n === index ? "true" : undefined}
                onClick={() => go(n)}
                className={cn("size-3 rounded-full border border-white outline-none focus-visible:ring-2 focus-visible:ring-white", n === index ? "bg-white" : "bg-white/30")}
              />
            ))}
          </div>
        </>
      )}
      <a
        href="#after-hero"
        aria-label={t.scrollCue}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full p-2 text-white outline-none drop-shadow-[0_1px_3px_rgb(0_0_0/0.6)] focus-visible:ring-2 focus-visible:ring-white motion-safe:animate-bounce"
      >
        <ChevronDown aria-hidden="true" className="size-7" />
      </a>
    </section>
  );
}

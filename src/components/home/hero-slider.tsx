"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { homeContent } from "@/content/home";
import { cloudinaryLoader } from "@/lib/news/cloudinary-loader";
import type { PublicHero, PublicSlide } from "@/lib/settings/public";
import type { ImageRef } from "@/lib/settings/types";
import { cn } from "cn";

function reducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function SlideImage({ image, alt, priority, className }: { image: ImageRef; alt: string; priority: boolean; className: string }) {
  // The bundled placeholder slide (no publicId) is a local SVG; everything else is Cloudinary.
  const local = image.publicId === "";
  return (
    <Image
      src={image.url}
      alt={alt}
      fill
      sizes="100vw"
      priority={priority}
      {...(local ? { unoptimized: true } : { loader: cloudinaryLoader })}
      className={cn("object-cover", className)}
    />
  );
}

/**
 * The banner keeps the first slide's own proportions (mobile picture below
 * `md`, desktop from `md`), so a wide banner is shown whole instead of being
 * cropped to a fixed height (owner's request); later slides with another
 * proportion are fitted to the same frame. Capped at 85% of the viewport.
 */
function heroRatio(slide: PublicSlide | undefined): React.CSSProperties {
  const desktop = slide?.desktop;
  const mobile = slide?.mobile ?? desktop;
  const ratio = (image: { width: number; height: number } | undefined, fallback: string) =>
    image && image.width > 0 && image.height > 0 ? `${image.width} / ${image.height}` : fallback;
  return {
    ["--hero-ratio-md" as string]: ratio(desktop, "1440 / 424"),
    ["--hero-ratio-sm" as string]: ratio(mobile, "375 / 328"),
  };
}

/**
 * The home hero (006 US1, research R9): the visible Settings slides in
 * order, each with its picture (the mobile picture below `md` when set),
 * optional heading and button. It advances after Settings' display time,
 * pauses while hovered or focused, never advances for reduced motion, and
 * shows arrows and dots only with more than one slide (FR-002–FR-005). The
 * first picture loads at once; the rest lazily (FR-030).
 */
export function HeroSlider({ hero }: { hero: PublicHero }) {
  const slides = hero.slides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const many = slides.length > 1;
  const t = homeContent.hero;

  const go = useCallback((to: number) => setIndex((to + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (!many || paused || reducedMotion()) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % slides.length);
    }, Math.max(3, hero.displaySeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [many, paused, hero.displaySeconds, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t.label}
      data-testid="hero"
      style={heroRatio(slides[0])}
      className="relative aspect-(--hero-ratio-sm) max-h-[85vh] w-full overflow-hidden bg-primary md:aspect-(--hero-ratio-md)"
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
              "absolute inset-0 motion-safe:transition-opacity motion-safe:duration-(--motion-fade)",
              active ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {slide.mobile ? (
              <>
                <SlideImage image={slide.mobile} alt={slide.alt} priority={n === 0} className="md:hidden" />
                <SlideImage image={slide.desktop} alt={slide.alt} priority={n === 0} className="hidden md:block" />
              </>
            ) : (
              <SlideImage image={slide.desktop} alt={slide.alt} priority={n === 0} className="" />
            )}
            {(slide.heading || slide.button) && (
              <div className="relative mx-auto flex h-full max-w-(--container-max-width) flex-col items-start justify-center gap-4 px-(--container-gutter-x)">
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
          <button
            type="button"
            aria-label={t.previous}
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white outline-none hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft aria-hidden="true" className="size-6" />
          </button>
          <button
            type="button"
            aria-label={t.next}
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white outline-none hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight aria-hidden="true" className="size-6" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
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
    </section>
  );
}

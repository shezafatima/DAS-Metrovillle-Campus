"use client";

import Image from "next/image";
import { cloudinaryLoader } from "@/lib/news/cloudinary-loader";

/**
 * Client Component, deliberately: `loader={cloudinaryLoader}` is a plain
 * function, and next/image's <Image> is itself a Client Component under
 * the hood. A Server Component parent can pass this file plain,
 * serializable props (image, variant, priority) — but it cannot pass a
 * function prop across that boundary ("Functions cannot be passed
 * directly to Client Components"). Marking this file "use client" keeps
 * cloudinaryLoader entirely inside client-rendered code, where passing
 * it to <Image> is a same-tree prop, not a server→client crossing.
 */

export interface CoverImageValue {
  url: string;
  alt: string;
}

export interface CoverImageProps {
  image: CoverImageValue;
  variant: "card" | "detail" | "home";
  priority?: boolean;
}

/** A post's cover, sized to the viewer's screen via Cloudinary (FR-026). */
export function CoverImage({ image, variant, priority }: CoverImageProps) {
  if (variant === "home") {
    return (
      <div className="relative aspect-home-news-card w-full overflow-hidden bg-neutral-100">
        <Image
          src={image.url}
          alt={image.alt}
          fill
          loader={cloudinaryLoader}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover motion-safe:transition-transform motion-safe:duration-(--motion-slide) group-hover:scale-105 group-focus-visible:scale-105"
          priority={priority}
        />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="relative aspect-news-card w-full overflow-hidden bg-neutral-100">
        <Image
          src={image.url}
          alt={image.alt}
          fill
          loader={cloudinaryLoader}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
          priority={priority}
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-news-card w-full overflow-hidden bg-neutral-100">
      <Image
        src={image.url}
        alt={image.alt}
        fill
        loader={cloudinaryLoader}
        sizes="(min-width: 1280px) 1280px, 100vw"
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}

/** Shown wherever a post has no cover image (US4/FR-017 — the layout must not break). */
export function CoverImagePlaceholder({ variant }: { variant: "card" | "detail" | "home" }) {
  return (
    <div
      className={variant === "home" ? "aspect-home-news-card w-full bg-neutral-100" : "aspect-news-card w-full bg-neutral-100"}
      aria-hidden="true"
      data-variant={variant}
    />
  );
}

import Link from "next/link";
import { newsPublicCopy } from "@/content/news";

export interface NewsBannerProps {
  title: string;
  /** Breadcrumb trail after "Home", e.g. ["News"] or ["News", post title]. */
  trail: string[];
  dir?: "ltr" | "rtl";
}

/**
 * The list/category/detail page banner — title + breadcrumb, matching
 * the reference's fixed navy banner (research/design-tokens.md "News
 * cards" — banner tokens). Height and title size step at `md:`/`lg:`
 * (two-tier, not fluid — see the token comment in globals.css).
 */
export function NewsBanner({ title, trail, dir }: NewsBannerProps) {
  return (
    <div className="flex h-(--spacing-news-banner-height) items-center bg-primary px-(--container-gutter-x) lg:h-(--spacing-news-banner-height-lg)">
      <div className="mx-auto flex w-full max-w-(--container-max-width) flex-wrap items-center justify-between gap-2">
        {/* Banner title line-height wasn't captured by the token
            extraction pass (research/extract-news-tokens.ts only reads
            font-size/color here) — left at the browser default rather
            than guessing a value (Constitution V). */}
        <h1
          dir={dir}
          className={`font-heading text-(length:--text-news-banner-title) font-bold text-topbar md:text-(length:--text-news-banner-title-md) ${dir === "rtl" ? "font-body-urdu" : ""}`}
        >
          {title}
        </h1>
        <nav aria-label="Breadcrumb" className="font-body text-white text-sm md:text-base">
          <Link href="/" className="hover:underline">
            {newsPublicCopy.banner.breadcrumbHome}
          </Link>
          {trail.map((crumb, i) => (
            <span key={i}>
              <span aria-hidden="true"> » </span>
              {crumb}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}

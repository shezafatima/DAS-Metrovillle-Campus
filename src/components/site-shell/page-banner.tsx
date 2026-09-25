import Image from "next/image";
import Link from "next/link";

export interface PageBannerProps {
  title: string;
  /** Breadcrumb trail after "Home", e.g. ["News"] or ["Contact"]. */
  trail: string[];
  dir?: "ltr" | "rtl";
  breadcrumbHome: string;
  /** Optional background image (e.g. the Contact banner's photo) rendered behind the content; falls back to bg-primary. */
  backgroundImage?: string;
}

/**
 * Shared page-title banner — title + breadcrumb, lifted out of
 * NewsBanner (research §14) once the Contact page's extracted banner
 * values (research/design-tokens.md "Contact page" → "Banner") turned
 * out identical to the News banner's, aside from an added background
 * image. Height and title size step at `md:`/`lg:` (two-tier, not
 * fluid — see the token comment in globals.css).
 */
export function PageBanner({ title, trail, dir, breadcrumbHome, backgroundImage }: PageBannerProps) {
  return (
    <div className="relative flex h-(--spacing-news-banner-height) items-center overflow-hidden bg-primary px-(--container-gutter-x) lg:h-(--spacing-news-banner-height-lg)">
      {backgroundImage && (
        <Image src={backgroundImage} alt="" fill priority className="object-cover" />
      )}
      <div className="relative mx-auto flex w-full max-w-(--container-max-width) flex-wrap items-center justify-between gap-2">
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
            {breadcrumbHome}
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

import Link from "next/link";
import { CoverImage, CoverImagePlaceholder } from "@/components/news/cover-image";
import { CategoryLabel } from "@/components/news/category-label";
import { formatPostDate, toUtcMidnight } from "@/lib/news/dates";
import { newsPublicCopy } from "@/content/news";
import type { PublicPostSummary } from "@/lib/news/public-queries";

/**
 * A single card on `/news` and — cover (or
 * placeholder) with the category label over its corner, title, date, excerpt, "Read More"
 * (FR-017, FR-037). Card padding/border/title/meta/excerpt/read-more
 * values are the extracted tokens from research/design-tokens.md
 * "News cards"; there is no grid gap on the reference (see that same
 * section) — spacing between cards comes entirely from this border.
 */
export function NewsCard({ post }: { post: PublicPostSummary }) {
  const dir = post.language === "ur" ? "rtl" : "ltr";
  const urduFont = post.language === "ur" ? "font-body-urdu" : "";

  return (
    <article className="flex flex-col border border-(--color-news-card-border) border-b-[3px]">
      <div className="relative">
        {post.coverImage ? (
          <CoverImage image={post.coverImage} variant="card" />
        ) : (
          <CoverImagePlaceholder variant="card" />
        )}
        <CategoryLabel category={post.category} dir={dir} overlay />
      </div>
      <div className="news-card-padding flex flex-1 flex-col gap-2">
        <h2 className={`font-heading text-(length:--text-news-card-title) leading-(--text-news-card-title--line-height) font-bold ${urduFont}`}>
          <Link href={`/news/${post.slug}`} dir={dir} className="text-primary hover:underline">
            {post.title}
          </Link>
        </h2>
        <p className="font-body text-(length:--text-news-meta) leading-(--text-news-meta--line-height) text-text">
          {formatPostDate(toUtcMidnight(post.publishDate))}
        </p>
        <p dir={dir} className={`font-body text-body text-text flex-1 ${urduFont}`}>
          {post.excerpt}
        </p>
        <Link
          href={`/news/${post.slug}`}
          className="font-body text-(length:--text-news-read-more) leading-(--text-news-read-more--line-height) text-primary hover:underline"
        >
          {newsPublicCopy.readMore} ›
        </Link>
      </div>
    </article>
  );
}

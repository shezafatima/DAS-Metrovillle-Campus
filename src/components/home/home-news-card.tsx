import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoverImage, CoverImagePlaceholder } from "@/components/news/cover-image";
import { newsPublicCopy } from "@/content/news";
import { categoryLabel } from "@/lib/news/categories";
import { formatPostDate, toUtcMidnight } from "@/lib/news/dates";
import type { PublicPostSummary } from "@/lib/news/public-queries";

/**
 * A news card on the home page (006): one link to the post. Top to bottom: the
 * cover (the neutral placeholder when the post has none), the date, the title
 * (three lines at most), a one-line excerpt, a thin divider and a footer row
 * with the category (plain text) and "Read More" (styled text, not a second
 * link). The footer is pinned to the bottom of the card, so footers line up
 * across cards of different title lengths.
 *
 * Truncation is CSS only; the stored title and excerpt are shown as they are.
 * The text follows the post's own language direction, so an Urdu card is
 * mirrored: the excerpt's ellipsis lands on the left, and the footer row and
 * the arrow flip. Hover and focus only move the cover (a slight zoom) and colour
 * the title.
 */
export function HomeNewsCard({ post }: { post: PublicPostSummary }) {
  const dir = post.language === "ur" ? "rtl" : "ltr";
  const urduFont = post.language === "ur" ? "font-body-urdu" : "";

  return (
    <Link
      href={`/news/${post.slug}`}
      data-testid="home-news-card"
      className="group flex h-full flex-col rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="overflow-hidden rounded-xl">
        {post.coverImage ? <CoverImage image={post.coverImage} variant="home" /> : <CoverImagePlaceholder variant="home" />}
      </div>
      <div dir={dir} className="flex flex-1 flex-col gap-2 pt-4">
        <p className="font-body text-(length:--text-news-meta) leading-(--text-news-meta--line-height) text-text-muted">
          {formatPostDate(toUtcMidnight(post.publishDate))}
        </p>
        <h3
          className={`line-clamp-3 break-words font-heading text-lg font-medium leading-snug text-(--color-home-dark-text) transition-colors duration-(--motion-fast) group-hover:text-primary group-focus-visible:text-primary ${urduFont}`}
        >
          {post.title}
        </h3>
        <p className={`truncate font-body text-body text-text-muted ${urduFont}`}>{post.excerpt}</p>
        <div className="mt-auto flex items-center justify-between gap-4 border-t border-black/10 pt-3 font-body text-(length:--text-news-meta) leading-(--text-news-meta--line-height)">
          <span className="min-w-0 truncate text-text-muted">{categoryLabel(post.category)}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-primary">
            {newsPublicCopy.readMore}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </span>
        </div>
      </div>
    </Link>
  );
}

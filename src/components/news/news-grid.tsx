import { NewsCard } from "@/components/news/news-card";
import type { PublicPostSummary } from "@/lib/news/public-queries";

/**
 * 1 / 2 / 3 columns at the reference's own measured breakpoints, which
 * are exactly Tailwind's default `md`/`lg` (research/design-tokens.md
 * "News cards" — Columns per width). No gap: the reference's cards
 * touch, separated only by their own border (see the same section).
 */
export function NewsGrid({ posts }: { posts: PublicPostSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <NewsCard key={post.slug} post={post} />
      ))}
    </div>
  );
}

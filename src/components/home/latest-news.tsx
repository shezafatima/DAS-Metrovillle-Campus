import Link from "next/link";
import { NewsCard } from "@/components/news/news-card";
import { homeContent } from "@/content/home";
import { getLatestPosts } from "@/lib/news/latest";
import { Carousel } from "./carousel";
import { SectionHeading } from "./section-heading";

/**
 * Latest News (006 US3): the six newest visible posts as the 003 news cards
 * (Urdu direction and font, cover placeholder included), three at a time at
 * ≥1024px and one below, with a link to the News page. No posts, or a failed
 * read, hides the whole section (FR-016).
 */
export async function LatestNews() {
  const posts = await getLatestPosts();
  if (posts.length === 0) return null;
  const { heading, line, viewAll } = homeContent.latestNews;
  return (
    <section aria-labelledby="latest-news-heading" className="bg-(--color-home-muted-band) py-(--spacing-home-band-y)" data-testid="latest-news">
      <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-8 px-(--container-gutter-x)">
        <SectionHeading id="latest-news-heading" heading={heading} line={line} />
        <Carousel label={heading} perViewClass="[--pv:1] lg:[--pv:3]">
          {posts.map((post) => (
            <NewsCard key={post.slug} post={post} />
          ))}
        </Carousel>
        <Link href={viewAll.href} className="self-center font-body text-accent text-sm hover:underline">
          {viewAll.label} ›
        </Link>
      </div>
    </section>
  );
}

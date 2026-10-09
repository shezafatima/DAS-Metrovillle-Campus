import Link from "next/link";
import { Newspaper } from "lucide-react";
import { homeContent } from "@/content/home";
import { getLatestPosts } from "@/lib/news/latest";
import { Carousel } from "./carousel";
import { HomeNewsCard } from "./home-news-card";

/**
 * Latest News (006 US3): the six newest visible posts as home news cards
 * (Urdu direction and font, cover placeholder included), three at a time at
 * ≥1024px and one below, with a link to the News page. No posts, or a failed
 * read, hides the whole section (FR-016).
 */
export async function LatestNews() {
  const posts = await getLatestPosts();
  if (posts.length === 0) return null;
  const { heading, line, label, viewAll } = homeContent.latestNews;
  return (
    <section aria-labelledby="latest-news-heading" className="bg-(--color-home-muted-band) pb-(--spacing-home-band-y)" data-testid="latest-news">
      {/* A full-width yellow band: the heading centred, the supporting text centred below it, at every width. Navy text; the cards below keep their background. */}
      <div className="bg-(--color-topbar) py-8 md:py-10" data-testid="latest-news-band">
        <div className="mx-auto grid max-w-(--container-max-width) items-start gap-y-4 px-(--container-gutter-x)">
          {/* A decorative pill (not a link or button): white, navy text and icon, a faint navy border. Left-aligned above the heading at every width. */}
          <span className="inline-flex items-center gap-1.5 justify-self-start rounded-full border border-primary/25 bg-surface px-3 py-1 font-body text-xs leading-4 font-semibold text-primary">
            <Newspaper aria-hidden="true" className="size-3.5" />
            {label}
          </span>
          <h2
            id="latest-news-heading"
            className="text-balance mx-auto text-center font-bold font-heading text-primary text-(length:--text-home-heading-sm) leading-(--text-home-heading--line-height) md:text-(length:--text-home-heading-md) lg:max-w-[30ch] lg:text-(length:--text-home-heading)"
          >
            {heading}
          </h2>
          <p className="mx-auto max-w-[60ch] text-center font-body text-primary text-(length:--text-home-subheading) leading-(--text-home-subheading--line-height)">{line}</p>
        </div>
      </div>
      <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-8 px-(--container-gutter-x) pt-8">
        <Carousel label={heading} perViewClass="[--pv:1] lg:[--pv:3]">
          {posts.map((post) => (
            <HomeNewsCard key={post.slug} post={post} />
          ))}
        </Carousel>
        <Link
          href={viewAll.href}
          className="self-center rounded-md border-2 border-primary px-8 py-3 font-button text-(length:--text-button) font-semibold text-primary uppercase outline-none transition-colors duration-(--motion-fast) hover:bg-primary hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {viewAll.label}
        </Link>
      </div>
    </section>
  );
}

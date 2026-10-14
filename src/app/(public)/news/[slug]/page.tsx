import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug } from "@/lib/news/public-queries";
import { decodeSlugParam } from "@/lib/news/slug";
import { NewsBanner } from "@/components/news/news-banner";
import { CoverImage } from "@/components/news/cover-image";
import { PostBody } from "@/components/news/post-body";
import { CategoryLabel } from "@/components/news/category-label";
import { formatPostDate, toUtcMidnight } from "@/lib/news/dates";
import { ogImageUrl } from "@/lib/news/cloudinary-loader";
import { SITE_OG_IMAGE } from "@/content/site-shell";

// force-dynamic: unpublish/delete must disappear from the public site
// immediately (research.md §6); the post depends on current DB state, not a
// cacheable static shell.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/news/[slug]">): Promise<Metadata> {
  // Next.js hands this dynamic segment through still percent-encoded for
  // non-ASCII slugs (e.g. Urdu) — decode before any comparison/lookup.
  const slug = decodeSlugParam((await params).slug);

  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};

  // FR-031: a post without a cover falls back to the site's default
  // preview image rather than omitting one (US6 scenario 2).
  const images = post.coverImage
    ? [{ url: ogImageUrl(post.coverImage.url), width: 1200, height: 630, alt: post.coverImage.alt }]
    : [{ url: SITE_OG_IMAGE }];
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/news/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishDate,
      images,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function NewsSlugPage({ params, searchParams }: PageProps<"/news/[slug]">) {
  const slug = decodeSlugParam((await params).slug);

  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const dir = post.language === "ur" ? "rtl" : "ltr";
  const urduFont = post.language === "ur" ? "font-body-urdu" : "";

  return (
    <>
      <NewsBanner title={post.title} trail={["News", post.title]} dir={dir} />
      <article className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x) py-section-gap-lg">
        <p className={`font-body text-body text-text-muted mb-2 ${urduFont}`} dir={dir}>
          {formatPostDate(toUtcMidnight(post.publishDate))}
        </p>
        <div className="mb-4">
          <CategoryLabel category={post.category} dir={dir} />
        </div>
        {post.coverImage && (
          <div className="mb-6">
            <CoverImage image={post.coverImage} variant="detail" priority />
          </div>
        )}
        <PostBody bodyHtml={post.bodyHtml} language={post.language} />
      </article>
    </>
  );
}

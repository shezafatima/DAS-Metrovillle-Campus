import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug, listPublishedPosts } from "@/lib/news/public-queries";
import { isCategoryKey, categoryLabel } from "@/lib/news/categories";
import { decodeSlugParam } from "@/lib/news/slug";
import { NewsBanner } from "@/components/news/news-banner";
import { NewsGrid } from "@/components/news/news-grid";
import { NewsEmptyState } from "@/components/news/news-empty-state";
import { NewsPagination } from "@/components/news/news-pagination";
import { CategoryFilter } from "@/components/news/category-filter";
import { CoverImage } from "@/components/news/cover-image";
import { PostBody } from "@/components/news/post-body";
import { newsPublicCopy, categoryPageTitle } from "@/content/news";
import { formatPostDate, toUtcMidnight } from "@/lib/news/dates";
import { ogImageUrl } from "@/lib/news/cloudinary-loader";
import { SITE_OG_IMAGE } from "@/content/site-shell";

// force-dynamic: unpublish/delete must disappear from the public site
// immediately (research.md §6), and both branches below (category list,
// post detail) depend on current DB state, not a cacheable static shell.
export const dynamic = "force-dynamic";

async function resolvePageParam(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const params = await searchParams;
  const page = typeof params.page === "string" ? Number(params.page) : 1;
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/news/[slug]">): Promise<Metadata> {
  // Next.js hands this dynamic segment through still percent-encoded for
  // non-ASCII slugs (e.g. Urdu) — decode before any comparison/lookup.
  const slug = decodeSlugParam((await params).slug);

  if (isCategoryKey(slug)) {
    const page = await resolvePageParam(searchParams);
    return {
      title: categoryPageTitle(categoryLabel(slug), page),
      description: newsPublicCopy.metaDescription,
    };
  }

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

  if (isCategoryKey(slug)) {
    const page = await resolvePageParam(searchParams);
    const result = await listPublishedPosts({ page, category: slug });
    const categoryTitle = categoryLabel(slug);

    return (
      <>
        <NewsBanner title={categoryTitle} trail={["News", categoryTitle]} />
        <div className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x) py-section-gap-lg">
          <CategoryFilter active={slug} />
          {result.items.length === 0 ? <NewsEmptyState /> : <NewsGrid posts={result.items} />}
          <NewsPagination page={result.page} totalPages={result.totalPages} basePath={`/news/${slug}`} />
        </div>
      </>
    );
  }

  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const dir = post.language === "ur" ? "rtl" : "ltr";
  const urduFont = post.language === "ur" ? "font-body-urdu" : "";

  return (
    <>
      <NewsBanner title={post.title} trail={["News", post.title]} dir={dir} />
      <article className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x) py-section-gap-lg">
        <p className={`font-body text-body text-text-muted mb-4 ${urduFont}`} dir={dir}>
          {formatPostDate(toUtcMidnight(post.publishDate))}
          <span aria-hidden="true"> | </span>
          {categoryLabel(post.category)}
        </p>
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

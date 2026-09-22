import type { Metadata } from "next";
import { listPublishedPosts } from "@/lib/news/public-queries";
import { NewsBanner } from "@/components/news/news-banner";
import { NewsGrid } from "@/components/news/news-grid";
import { NewsEmptyState } from "@/components/news/news-empty-state";
import { NewsPagination } from "@/components/news/news-pagination";
import { CategoryFilter } from "@/components/news/category-filter";
import { newsPublicCopy, pageTitle } from "@/content/news";

// Reads on request so unpublish/publish/delete are reflected immediately
// (research.md §6 — no ISR/ revalidate for this feature).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: PageProps<"/news">): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = typeof pageParam === "string" ? Number(pageParam) : 1;
  return {
    title: pageTitle(Number.isFinite(page) && page > 0 ? page : 1),
    description: newsPublicCopy.metaDescription,
  };
}

export default async function NewsListPage({ searchParams }: PageProps<"/news">) {
  const { page: pageParam } = await searchParams;
  const page = typeof pageParam === "string" ? Number(pageParam) : 1;
  const result = await listPublishedPosts({ page: Number.isFinite(page) && page > 0 ? page : 1 });

  return (
    <>
      <NewsBanner title={newsPublicCopy.banner.title} trail={["News"]} />
      <div className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x) py-section-gap-lg">
        <CategoryFilter />
        {result.items.length === 0 ? (
          <NewsEmptyState />
        ) : (
          <NewsGrid posts={result.items} />
        )}
        <NewsPagination page={result.page} totalPages={result.totalPages} basePath="/news" />
      </div>
    </>
  );
}

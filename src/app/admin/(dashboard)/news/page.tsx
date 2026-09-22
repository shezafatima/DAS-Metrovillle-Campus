import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { listAdminPosts } from "@/lib/news/admin-queries";
import { NewsTable } from "@/components/admin/news/news-table";
import { NewsTableFilters } from "@/components/admin/news/news-table-filters";
import { NewsPagination } from "@/components/admin/news/news-pagination";
import { buttonVariants } from "@/components/ui/button";
import { newsCopy } from "@/content/admin";

export const metadata: Metadata = { title: "News" };

export default async function AdminNewsPage({
  searchParams,
}: PageProps<"/admin/news">) {
  await requireAdminSession();

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const page = typeof params.page === "string" ? Number(params.page) : 1;

  const result = await listAdminPosts({
    q,
    status: status as "draft" | "published" | "all" | undefined,
    category,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-bold text-2xl text-foreground">{newsCopy.pageTitle}</h1>
        <Link href="/admin/news/new" className={buttonVariants()}>
          {newsCopy.newPost}
        </Link>
      </div>
      <NewsTableFilters />
      <NewsTable rows={result.items} />
      <NewsPagination page={result.page} totalPages={result.totalPages} searchParams={{ q, status, category }} />
    </div>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { newsCopy } from "@/content/admin";

export interface AdminNewsPaginationProps {
  page: number;
  totalPages: number;
  /** Current search params (q, status, category), excluding page — carried forward on prev/next links. */
  searchParams: Record<string, string | undefined>;
}

function hrefFor(page: number, searchParams: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/news?${query}` : "/admin/news";
}

export function NewsPagination({ page, totalPages, searchParams }: AdminNewsPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <span className="font-light text-sm text-muted-foreground">
        {newsCopy.pagination.pageOf(page, totalPages)}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1, searchParams)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {newsCopy.pagination.previous}
          </Link>
        ) : (
          <span className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}>
            {newsCopy.pagination.previous}
          </span>
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1, searchParams)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {newsCopy.pagination.next}
          </Link>
        ) : (
          <span className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}>
            {newsCopy.pagination.next}
          </span>
        )}
      </div>
    </nav>
  );
}

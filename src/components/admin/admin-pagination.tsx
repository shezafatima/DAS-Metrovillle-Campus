import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export interface AdminPaginationCopy {
  previous: string;
  next: string;
  pageOf: (page: number, totalPages: number) => string;
}

export interface AdminPaginationProps {
  page: number;
  totalPages: number;
  /** The admin list page this pagination belongs to, e.g. "/admin/news". */
  basePath: string;
  /** Current search params (excluding page) — carried forward on prev/next links. */
  searchParams: Record<string, string | undefined>;
  copy: AdminPaginationCopy;
}

function hrefFor(basePath: string, page: number, searchParams: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Shared admin-list pagination (moved out of
 * src/components/admin/news/news-pagination.tsx — sp.analyze finding
 * D1 / Constitution VI: one shared component, built once, instead of a
 * second near-identical copy for the signup list). `news-pagination.tsx`
 * is now a thin wrapper over this with `basePath="/admin/news"`.
 */
export function AdminPagination({ page, totalPages, basePath, searchParams, copy }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <span className="font-light text-sm text-muted-foreground">{copy.pageOf(page, totalPages)}</span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(basePath, page - 1, searchParams)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {copy.previous}
          </Link>
        ) : (
          <span
            className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}
          >
            {copy.previous}
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={hrefFor(basePath, page + 1, searchParams)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {copy.next}
          </Link>
        ) : (
          <span
            className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}
          >
            {copy.next}
          </span>
        )}
      </div>
    </nav>
  );
}

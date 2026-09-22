import Link from "next/link";
import { newsCopy } from "@/content/admin";

export interface NewsPaginationProps {
  page: number;
  totalPages: number;
  /** e.g. "/news" or "/news/events" — page 1 omits ?page= entirely. */
  basePath: string;
}

function hrefFor(basePath: string, page: number): string {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}

/** Prev/next links carrying `?page=`, so each page has its own shareable, indexable address (FR-016). */
export function NewsPagination({ page, totalPages, basePath }: NewsPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-4 py-8">
      {page > 1 ? (
        <Link href={hrefFor(basePath, page - 1)} className="font-body text-primary hover:underline">
          {newsCopy.pagination.previous}
        </Link>
      ) : (
        <span aria-disabled="true" className="font-body text-text-muted">
          {newsCopy.pagination.previous}
        </span>
      )}
      <span className="font-body text-text-muted text-sm">
        {newsCopy.pagination.pageOf(page, totalPages)}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(basePath, page + 1)} className="font-body text-primary hover:underline">
          {newsCopy.pagination.next}
        </Link>
      ) : (
        <span aria-disabled="true" className="font-body text-text-muted">
          {newsCopy.pagination.next}
        </span>
      )}
    </nav>
  );
}
